import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ThreeDSecure } from '../src/resources/three-d-secure';
import type { BrowserAuthenticator } from '../src/utils/three-d-secure/browser-authenticator';

const CLIENT_SECRET = '4fJq8Wm2Xc7Nb1Rt5Yh9Lk3Vd0Ze6Sa7Xp2Qn';

const SESSION = {
  id: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790',
  status: 'requires_action',
  nextAction: {
    type: 'browser_authentication',
    token: 'session-token',
    environment: 'sandbox',
    payload: { opaque: true, amount: 10990 },
  },
};

const PROVIDER_RESULT = { reference_a: 'x', reference_b: 'y' };

function makeHttp(overrides: { start?: any; complete?: any } = {}) {
  const post = vi.fn(async (url: string, body?: any) => {
    if (url === '/3ds/sessions/start') return overrides.start ?? SESSION;
    if (url === '/3ds/sessions/complete') {
      return overrides.complete ?? { ...SESSION, status: body?.outcome === 'completed' ? 'completed' : 'canceled', nextAction: null };
    }
    throw new Error(`unexpected url ${url}`);
  });
  return { post } as any;
}

function makeAuthenticator(authenticate: () => Promise<any>): BrowserAuthenticator & { init: any; authenticate: any } {
  return { init: vi.fn(), authenticate: vi.fn(authenticate) };
}

const params = { clientSecret: CLIENT_SECRET };

describe('ThreeDSecure.authenticate', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('starts the session, runs the browser authentication and completes it', async () => {
    const http = makeHttp();
    const auth = makeAuthenticator(async () => PROVIDER_RESULT);
    const statuses: string[] = [];
    const tds = new ThreeDSecure(http, async () => auth);

    const result = await tds.authenticate(params, { onStatusChange: (s) => statuses.push(s) });

    expect(result).toEqual({ sessionId: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790', status: 'completed' });
    // Starting is idempotent on the server: there is no session to create and no key to send.
    expect(http.post.mock.calls[0]).toEqual(['/3ds/sessions/start', { clientSecret: CLIENT_SECRET }]);
    expect(auth.init).toHaveBeenCalledWith({ token: 'session-token', env: 'sandbox' });
    expect(auth.authenticate).toHaveBeenCalledWith({ opaque: true, amount: 10990 });
    expect(http.post.mock.calls[1]).toEqual([
      '/3ds/sessions/complete',
      { clientSecret: CLIENT_SECRET, outcome: 'completed', result: PROVIDER_RESULT },
    ]);
    expect(statuses).toEqual(['starting', 'authenticating', 'completing', 'idle']);
  });

  it('validates params before calling the API', async () => {
    const http = makeHttp();
    const tds = new ThreeDSecure(http, async () => makeAuthenticator(async () => PROVIDER_RESULT));

    await expect(tds.authenticate({} as any)).rejects.toMatchObject({
      type: 'client_error',
      code: 'invalid_params',
    });
    await expect(tds.authenticate(undefined as any)).rejects.toMatchObject({ code: 'invalid_params' });
    await expect(tds.authenticate({ clientSecret: 123 } as any)).rejects.toMatchObject({ code: 'invalid_params' });
    expect(http.post).not.toHaveBeenCalled();
  });

  it('resolves straight away when the session is already completed', async () => {
    const http = makeHttp({ start: { id: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790', status: 'completed', nextAction: null } });
    const loader = vi.fn(async () => makeAuthenticator(async () => PROVIDER_RESULT));
    const tds = new ThreeDSecure(http, loader);

    await expect(tds.authenticate(params)).resolves.toEqual({ sessionId: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790', status: 'completed' });

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('surfaces a failed start without completing anything', async () => {
    const error = { type: 'api_error', code: 'session_expired', message: 'The 3D Secure session has expired', statusCode: 410 };
    const http = { post: vi.fn(async () => Promise.reject(error)) } as any;
    const tds = new ThreeDSecure(http, async () => makeAuthenticator(async () => PROVIDER_RESULT));

    await expect(tds.authenticate(params)).rejects.toEqual(error);

    expect(http.post).toHaveBeenCalledTimes(1);
  });

  it('allows a new authentication after a failed start', async () => {
    const http = { post: vi.fn(async () => Promise.reject({ type: 'api_error', statusCode: 502 })) } as any;
    const tds = new ThreeDSecure(http, async () => makeAuthenticator(async () => PROVIDER_RESULT));

    await tds.authenticate(params).catch(() => undefined);

    await expect(tds.authenticate(params)).rejects.not.toMatchObject({ code: 'authentication_in_progress' });
  });

  it('never forwards the authentication module error and reports the failure', async () => {
    const http = makeHttp();
    const auth = makeAuthenticator(async () => {
      throw new Error('internal provider message');
    });
    const tds = new ThreeDSecure(http, async () => auth);

    const error: any = await tds.authenticate(params).catch((e) => e);

    expect(error).toMatchObject({ type: 'three_d_secure_error', code: 'authentication_failed' });
    expect(JSON.stringify(error)).not.toContain('internal provider message');
    expect(http.post.mock.calls[1]).toEqual([
      '/3ds/sessions/complete',
      { clientSecret: CLIENT_SECRET, outcome: 'failed', failureCode: 'authentication_failed' },
    ]);
  });

  it('times out when the authentication never settles', async () => {
    const http = makeHttp();
    const auth = makeAuthenticator(() => new Promise(() => undefined));
    const tds = new ThreeDSecure(http, async () => auth);

    await expect(tds.authenticate(params, { timeoutMs: 50 })).rejects.toMatchObject({ code: 'authentication_timeout' });
    expect(http.post.mock.calls[1][1]).toEqual({
      clientSecret: CLIENT_SECRET,
      outcome: 'timeout',
      failureCode: 'authentication_timeout',
    });
  });

  it('treats a dismissed challenge as canceled', async () => {
    const http = makeHttp();
    const auth = makeAuthenticator(
      () =>
        new Promise(() => {
          // Simulates the module opening its challenge modal and the buyer closing it (Escape).
          const modal = document.createElement('div');
          const frame = document.createElement('iframe');
          frame.style.width = '390px';
          frame.style.height = '400px';
          modal.appendChild(frame);
          document.body.appendChild(modal);
          setTimeout(() => modal.remove(), 60);
        })
    );
    const tds = new ThreeDSecure(http, async () => auth, { dismissGraceMs: 20 });

    await expect(tds.authenticate(params, { timeoutMs: 5000 })).rejects.toMatchObject({ code: 'authentication_canceled' });
    expect(http.post.mock.calls[1][1]).toEqual({
      clientSecret: CLIENT_SECRET,
      outcome: 'canceled',
      failureCode: 'authentication_canceled',
    });
  });

  it('does not cancel when the hidden device-data frame is removed', async () => {
    const http = makeHttp();
    const auth = makeAuthenticator(
      () =>
        new Promise((resolve) => {
          const frame = document.createElement('iframe');
          frame.style.width = '1px';
          frame.style.height = '1px';
          document.body.appendChild(frame);
          setTimeout(() => frame.remove(), 30);
          setTimeout(() => resolve(PROVIDER_RESULT), 120);
        })
    );
    const tds = new ThreeDSecure(http, async () => auth, { dismissGraceMs: 20 });

    await expect(tds.authenticate(params)).resolves.toEqual({ sessionId: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790', status: 'completed' });
  });

  it('reports unavailability when the module cannot be loaded', async () => {
    const http = makeHttp();
    const tds = new ThreeDSecure(http, async () => {
      throw new Error('load failed');
    });

    await expect(tds.authenticate(params)).rejects.toMatchObject({ code: 'authentication_unavailable' });
    expect(http.post.mock.calls[1][1]).toEqual({
      clientSecret: CLIENT_SECRET,
      outcome: 'failed',
      failureCode: 'authentication_unavailable',
    });
  });

  it('rejects a second authentication while one is in progress', async () => {
    let release: (value: any) => void = () => undefined;
    const http = makeHttp();
    const auth = makeAuthenticator(() => new Promise((resolve) => (release = resolve)));
    const tds = new ThreeDSecure(http, async () => auth);

    const first = tds.authenticate(params);
    await expect(tds.authenticate(params)).rejects.toMatchObject({ code: 'authentication_in_progress' });

    await new Promise((r) => setTimeout(r, 10));
    release(PROVIDER_RESULT);
    await expect(first).resolves.toEqual({ sessionId: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790', status: 'completed' });
  });

  it('rejects an unexpected start response', async () => {
    const http = makeHttp({ start: { id: '9b7c1e52-3f0a-4d86-a1c4-6e2d8f35b790', status: 'requires_action', nextAction: null } });
    const tds = new ThreeDSecure(http, async () => makeAuthenticator(async () => PROVIDER_RESULT));

    await expect(tds.authenticate(params)).rejects.toMatchObject({ code: 'invalid_response' });
  });
});
