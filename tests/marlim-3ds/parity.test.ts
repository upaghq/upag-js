import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import {
  canonicalizeHeaders,
  comparableTrace,
  dispatchEscape,
  dispatchMessage,
  flushMicrotasks,
  loadOracle,
  loadPort,
  recordOutcome,
  withWorld,
  type Sdk,
  type Trace,
  type World,
} from './harness';
import {
  CARD_ID,
  TOKEN,
  authenticateChallenge,
  authenticateOk,
  basePayload,
  card,
  customer,
  monthOffsetExpiry,
  setupOk,
} from './payloads';

type Env = 'sandbox' | 'production';

type HttpPlan =
  | { kind: 'ok' }
  | { kind: 'setup-json'; status: number; body: unknown }
  | { kind: 'auth-json'; status: number; body: unknown }
  | { kind: 'setup-text'; status: number; body: string }
  | { kind: 'auth-text'; status: number; body: string }
  | { kind: 'setup-timeout' }
  | { kind: 'auth-timeout' }
  | { kind: 'setup-network' }
  | { kind: 'auth-network' };

interface Scenario {
  name: string;
  env: Env;
  init?: unknown;
  skipInit?: boolean;
  payload: unknown;
  setup?: Record<string, unknown>;
  authenticate?: Record<string, unknown>;
  http?: HttpPlan;
  ddc?: 'complete' | 'timeout' | 'foreign';
  challenge?: 'none' | 'complete' | 'foreign' | 'escape';
  validation?: boolean;
  twice?: boolean;
  portOnly?: boolean;
}

let activeTrace: Trace | null = null;
let httpPlan: HttpPlan = { kind: 'ok' };
let setupBody: Record<string, unknown> = setupOk();
let authenticateBody: Record<string, unknown> = authenticateOk();

async function capture(request: Request): Promise<void> {
  if (!activeTrace) return;
  activeTrace.requests.push({
    method: request.method,
    url: request.url,
    headers: canonicalizeHeaders(request.headers),
    body: await request.clone().text(),
  });
}

const SETUP = /https:\/\/(sandbox\.)?api\.marlim\.co\/v3\/3ds\/setup/;
const AUTH = /https:\/\/(sandbox\.)?api\.marlim\.co\/v3\/3ds\/authenticate/;

const server = setupServer(
  http.post(SETUP, async ({ request }) => {
    await capture(request);
    if (httpPlan.kind === 'setup-timeout') {
      await delay(60_000);
    }
    if (httpPlan.kind === 'setup-network') {
      return HttpResponse.error();
    }
    if (httpPlan.kind === 'setup-json') {
      return HttpResponse.json(httpPlan.body as never, { status: httpPlan.status });
    }
    if (httpPlan.kind === 'setup-text') {
      return new HttpResponse(httpPlan.body, {
        status: httpPlan.status,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return HttpResponse.json(setupBody);
  }),
  http.post(AUTH, async ({ request }) => {
    await capture(request);
    if (httpPlan.kind === 'auth-timeout') {
      await delay(60_000);
    }
    if (httpPlan.kind === 'auth-network') {
      return HttpResponse.error();
    }
    if (httpPlan.kind === 'auth-json') {
      return HttpResponse.json(httpPlan.body as never, { status: httpPlan.status });
    }
    if (httpPlan.kind === 'auth-text') {
      return new HttpResponse(httpPlan.body, {
        status: httpPlan.status,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
    return HttpResponse.json(authenticateBody);
  })
);

function ddcOrigin(env: Env): string {
  return env === 'sandbox'
    ? 'https://centinelapistag.cardinalcommerce.com'
    : 'https://centinelapi.cardinalcommerce.com';
}

function apiOrigin(env: Env): string {
  return env === 'sandbox' ? 'https://sandbox.api.marlim.co' : 'https://api.marlim.co';
}

async function waitFor(predicate: () => boolean, label: string, world?: World): Promise<void> {
  for (let i = 0; i < 80; i += 1) {
    if (predicate()) return;
    await flushMicrotasks(5);
    await vi.advanceTimersByTimeAsync(0);
  }
  const extra = world
    ? ` requests=${JSON.stringify(world.trace.requests)} submits=${JSON.stringify(world.trace.submits)} consoles=${JSON.stringify(world.trace.consoles)}`
    : '';
  throw new Error(`Timed out waiting for ${label}.${extra}`);
}

async function settle(promise: Promise<unknown>): Promise<PromiseSettledResult<unknown>> {
  try {
    return { status: 'fulfilled', value: await promise };
  } catch (reason) {
    return { status: 'rejected', reason };
  }
}

async function drive(world: World, scenario: Scenario, promise: Promise<unknown>): Promise<void> {
  await flushMicrotasks();
  await vi.advanceTimersByTimeAsync(0);

  if (scenario.validation || scenario.skipInit) {
    recordOutcome(world.trace, await settle(promise));
    return;
  }

  const httpKind = scenario.http?.kind ?? 'ok';
  if (httpKind.startsWith('setup-') && httpKind !== 'ok') {
    if (httpKind === 'setup-timeout') {
      vi.advanceTimersByTime(10000);
      await flushMicrotasks();
    }
    recordOutcome(world.trace, await settle(promise));
    return;
  }

  const ddc = scenario.ddc ?? 'complete';
  let settledEarly: PromiseSettledResult<unknown> | undefined;
  promise.then(
    (value) => {
      settledEarly = { status: 'fulfilled', value };
    },
    (reason) => {
      settledEarly = { status: 'rejected', reason };
    }
  );
  await waitFor(
    () => world.trace.submits.some((item) => item.id === 'session-form') || !!settledEarly,
    'DDC form submit',
    world
  );
  if (settledEarly && !world.trace.submits.some((item) => item.id === 'session-form')) {
    recordOutcome(world.trace, settledEarly);
    return;
  }
  world.snapshot('after-ddc-submit');

  if (ddc === 'complete') {
    dispatchMessage(world, ddcOrigin(scenario.env), { MessageType: 'profile.completed' });
  } else if (ddc === 'foreign') {
    dispatchMessage(world, 'https://evil.example', { MessageType: 'profile.completed' });
    await vi.advanceTimersByTimeAsync(10000);
  } else {
    await vi.advanceTimersByTimeAsync(10000);
  }
  world.snapshot('after-ddc');

  if (httpKind.startsWith('auth-')) {
    if (httpKind === 'auth-timeout') {
      vi.advanceTimersByTime(10000);
      await flushMicrotasks();
    }
    recordOutcome(world.trace, await settle(promise));
    return;
  }

  if ((scenario.challenge ?? 'none') === 'none') {
    recordOutcome(world.trace, await settle(promise));
    return;
  }

  await waitFor(() => world.trace.submits.some((item) => item.id === 'step-up-form'), 'challenge form submit');
  await vi.advanceTimersByTimeAsync(10);
  world.snapshot('after-challenge-show');

  if (scenario.challenge === 'complete') {
    dispatchMessage(world, apiOrigin(scenario.env), { status: 'completed' });
    recordOutcome(world.trace, await settle(promise));
    return;
  }
  if (scenario.challenge === 'foreign') {
    dispatchMessage(world, 'https://evil.example', { status: 'completed' });
    await flushMicrotasks();
    world.trace.result = { status: 'pending' };
    return;
  }

  dispatchEscape(world);
  await vi.advanceTimersByTimeAsync(300);
  world.snapshot('after-escape');
  world.trace.result = { status: 'pending' };
}

async function runOnce(load: (world: World) => Sdk | Promise<Sdk>, scenario: Scenario): Promise<Trace> {
  return withWorld(async (world) => {
    activeTrace = world.trace;
    const sdk = await load(world);

    const initConfig = scenario.init ?? { token: TOKEN, env: scenario.env };
    if (!scenario.skipInit) {
      try {
        sdk.init(initConfig);
      } catch (reason) {
        recordOutcome(world.trace, { status: 'rejected', reason });
        world.snapshot('end');
        return world.trace;
      }
    }

    const runAuth = () => {
      const pending = Promise.resolve().then(() => sdk.authenticate(scenario.payload));
      pending.catch(() => undefined);
      return pending;
    };
    const first = runAuth();
    await drive(world, scenario, first);

    if (scenario.twice && world.trace.result.status === 'resolved') {
      const second = runAuth();
      await drive(world, { ...scenario, twice: false }, second);
    }

    world.snapshot('end');
    return world.trace;
  });
}

async function expectParity(scenario: Scenario): Promise<void> {
  httpPlan = scenario.http ?? { kind: 'ok' };
  setupBody = scenario.setup ?? setupOk();
  authenticateBody = scenario.authenticate ?? authenticateOk();

  const port = await runOnce(() => loadPort(), scenario);
  if (scenario.portOnly) {
    expect(port.result).toEqual({ status: 'rejected', kind: 'Error', message: 'Request error.' });
    return;
  }

  const oracle = await runOnce((world) => loadOracle(world), scenario);
  expect(comparableTrace(port, { ignoreValidationMessage: scenario.validation })).toEqual(
    comparableTrace(oracle, { ignoreValidationMessage: scenario.validation })
  );
}

const happy = (env: Env, payload: unknown, extra: Partial<Scenario> = {}): Scenario => ({
  name: `${env} happy`,
  env,
  payload,
  ddc: 'complete',
  challenge: 'none',
  ...extra,
});

const scenarios: Scenario[] = [
  happy('sandbox', basePayload()),
  happy('production', basePayload()),
  happy('sandbox', { amount: 1000, card_hash: 'HASH123', customer: customer() }),
  happy('sandbox', { amount: 1000, card_id: `  ${CARD_ID}  `, customer: customer() }),
  {
    name: 'camelCase aliases',
    env: 'sandbox',
    payload: {
      amount: 1000,
      softDescriptorChallenge: 'LOJA EXEMPLO',
      cardHash: 'HASH123',
      customer: {
        name: 'Jose Silva',
        documentNumber: '12345678909',
        email: 'jose.silva@example.com',
        phone: { number: '999999999', areaCode: '11', countryCode: '55' },
        address: customer().address,
      },
    },
  },
  {
    name: 'soft descriptor trimmed spaces',
    env: 'sandbox',
    payload: basePayload({ soft_descriptor_challenge: '  LOJA EXEMPLO  ' }),
  },
  {
    name: 'soft descriptor 31 chars',
    env: 'sandbox',
    payload: basePayload({ soft_descriptor_challenge: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ01234' }),
    validation: true,
  },
  {
    name: 'soft descriptor special char',
    env: 'sandbox',
    payload: basePayload({ soft_descriptor_challenge: 'LOJA!' }),
    validation: true,
  },
  {
    name: 'no card source',
    env: 'sandbox',
    payload: { amount: 1000, customer: customer() },
    validation: true,
  },
  {
    name: 'two card sources',
    env: 'sandbox',
    payload: basePayload({ card_hash: 'HASH123' }),
    validation: true,
  },
  {
    name: 'expired last month',
    env: 'sandbox',
    payload: basePayload({ card: card({ expiration_date: monthOffsetExpiry(-1) }) }),
    validation: true,
  },
  {
    name: 'current month expiry',
    env: 'sandbox',
    payload: basePayload({ card: card({ expiration_date: monthOffsetExpiry(0) }) }),
  },
  {
    name: 'next month expiry',
    env: 'sandbox',
    payload: basePayload({ card: card({ expiration_date: monthOffsetExpiry(1) }) }),
  },
  {
    name: 'sandbox challenge true',
    env: 'sandbox',
    payload: basePayload({ challenge: true }),
    authenticate: authenticateChallenge('01'),
    challenge: 'complete',
  },
  {
    name: 'sandbox challenge false',
    env: 'sandbox',
    payload: basePayload({ challenge: false }),
  },
  {
    name: 'production challenge false',
    env: 'production',
    payload: basePayload({ challenge: false }),
    validation: true,
  },
  {
    name: 'DDC timeout',
    env: 'sandbox',
    payload: basePayload(),
    ddc: 'timeout',
  },
  {
    name: 'DDC foreign origin then timeout',
    env: 'sandbox',
    payload: basePayload(),
    ddc: 'foreign',
  },
  ...(['01', '02', '03', '04', '05', '99'] as const).map((size) => ({
    name: `challenge window ${size}`,
    env: 'sandbox' as const,
    payload: basePayload(),
    authenticate: authenticateChallenge(size),
    challenge: 'complete' as const,
  })),
  {
    name: 'challenge foreign origin',
    env: 'sandbox',
    payload: basePayload(),
    authenticate: authenticateChallenge('01'),
    challenge: 'foreign',
  },
  {
    name: 'challenge Escape pending',
    env: 'sandbox',
    payload: basePayload(),
    authenticate: authenticateChallenge('01'),
    challenge: 'escape',
  },
  {
    name: 'HTTP 4xx message',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'setup-json', status: 400, body: { message: 'Nope' } },
  },
  {
    name: 'HTTP 4xx error string',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'setup-json', status: 400, body: { error: 'bad' } },
  },
  {
    name: 'HTTP 4xx errors array',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'setup-json', status: 400, body: { errors: [{ message: '  field  ' }] } },
  },
  {
    name: 'HTTP 4xx non-json',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'setup-text', status: 400, body: 'not-json' },
  },
  {
    name: 'HTTP 2xx missing access_token',
    env: 'sandbox',
    payload: basePayload(),
    setup: { card_id: CARD_ID, data_collection_url: 'https://centinelapistag.cardinalcommerce.com/x', session_id: 's' },
  },
  {
    name: 'HTTP setup timeout',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'setup-timeout' },
    portOnly: true,
  },
  {
    name: 'HTTP setup network',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'setup-network' },
  },
  {
    name: 'HTTP auth 4xx after DDC',
    env: 'sandbox',
    payload: basePayload(),
    http: { kind: 'auth-json', status: 422, body: { message: 'auth failed' } },
  },
  {
    name: 'authenticate before init',
    env: 'sandbox',
    payload: basePayload(),
    skipInit: true,
  },
  {
    name: 'two authentications',
    env: 'sandbox',
    payload: basePayload(),
    twice: true,
  },
  {
    name: 'init extra keys discarded',
    env: 'sandbox',
    init: { token: TOKEN, env: 'sandbox', extra: true },
    payload: basePayload(),
  },
];

describe('Marlim 3DS 1.1.0 parity', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterAll(() => {
    server.close();
  });

  beforeEach(() => {
    vi.useFakeTimers();
    activeTrace = null;
  });

  afterEach(() => {
    server.resetHandlers();
    vi.useRealTimers();
  });

  it.each(scenarios)(
    '$name',
    async (scenario) => {
      await expectParity(scenario);
    },
    15000
  );
});
