import { describe, it, expect, vi, afterEach } from 'vitest';
import { UpagJs } from '../src/client';
import { HttpClient } from '../src/utils/http-client';
import { resolveBaseURL } from '../src/utils/api-base-url';

const PRODUCTION = 'https://api.upag.io/v1';
const SANDBOX = 'https://api.upag.dev/v1';

function baseURLOf(http: unknown): string | undefined {
  return (http as { baseURL?: string }).baseURL;
}

function headersOf(http: unknown): Record<string, string> {
  return (http as { headers: Record<string, string> }).headers;
}

describe('API base URL', () => {
  it('defaults to production', () => {
    expect(resolveBaseURL({ publicKey: 'pk_xxx' })).toBe(PRODUCTION);
  });

  it('defaults a live or unknown key to production', () => {
    expect(resolveBaseURL({ publicKey: 'pk_live_abc' })).toBe(PRODUCTION);
    expect(resolveBaseURL({ publicKey: 'pk_xxx' })).toBe(PRODUCTION);
  });

  it('lets an explicit environment override the key', () => {
    expect(resolveBaseURL({ publicKey: 'pk_live_abc', environment: 'sandbox' })).toBe(SANDBOX);
    expect(resolveBaseURL({ publicKey: 'pk_test_abc', environment: 'production' })).toBe(PRODUCTION);
  });

  it('lets baseURL override everything', () => {
    expect(
      resolveBaseURL({
        publicKey: 'pk_test_abc',
        environment: 'production',
        baseURL: 'http://localhost:3000/v1',
      })
    ).toBe('http://localhost:3000/v1');
  });
});

describe('UpagJs clients', () => {
  it('sends cards, checkout and 3D Secure to the same API host', () => {
    const upag = new UpagJs({ publicKey: 'pk_test_abc', environment: 'sandbox' }) as any;

    expect(baseURLOf(upag.http)).toBe(SANDBOX);
    expect(upag.cards.http).toBe(upag.http);
    expect(upag.checkout.http).toBe(upag.http);
    expect(upag.threeDSecure.http).toBe(upag.http);
  });

  it('lets baseURL override the host for every resource', () => {
    const upag = new UpagJs({
      publicKey: 'pk_live_abc',
      environment: 'sandbox',
      baseURL: 'https://api.example/v1',
    }) as any;

    expect(baseURLOf(upag.http)).toBe('https://api.example/v1');
  });

  it('authenticates both clients with the same public key', () => {
    const upag = new UpagJs({ publicKey: 'pk_test_abc', environment: 'sandbox' }) as any;

    expect(headersOf(upag.http).Authorization).toBe('Bearer pk_test_abc');

  });

  it('does not set a User-Agent, which browsers refuse to let scripts set', () => {
    const http = new HttpClient({ publicKey: 'pk_test_abc' }) as any;

    expect(headersOf(http)['User-Agent']).toBeUndefined();
  });
});

function jsonResponse(status: number, data: unknown): Response {
  const body = typeof data === 'string' ? data : JSON.stringify(data);
  return new Response(status === 204 ? null : body, { status });
}

function stubFetch(impl: (url: string, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn(impl);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('HttpClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const client = () => new HttpClient({ publicKey: 'pk_test_abc', baseURL: 'https://api.test/v1' });

  it('sends the key, a JSON body and the joined url', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, { id: 'x' }));

    const result = await client().post('/cards', { a: 1 });

    expect(result).toEqual({ id: 'x' });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/v1/cards');
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers).toEqual({
      Authorization: 'Bearer pk_test_abc',
      'Content-Type': 'application/json',
    });
  });

  it('merges per-request headers and sends no body on GET', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));

    await client().get('cards', { headers: { 'X-Test': '1' } });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.test/v1/cards');
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect((init.headers as Record<string, string>)['X-Test']).toBe('1');
  });

  it('omits Authorization when auth is none', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(201, {}));

    await client().post('/checkout/payment-links/code/sessions', {}, { auth: 'none' });

    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('sends a client secret instead of the public key', async () => {
    const fetchMock = stubFetch(async () => jsonResponse(200, {}));

    await client().get('/checkout/sessions/1', { auth: { clientSecret: 'cs_secret' } });

    expect((fetchMock.mock.calls[0][1].headers as Record<string, string>).Authorization).toBe('Bearer cs_secret');
  });

  it('returns undefined for an empty body', async () => {
    stubFetch(async () => jsonResponse(204, ''));

    await expect(client().delete('/cards/1')).resolves.toBeUndefined();
  });

  it('reads the fields billing puts at the top of the body', async () => {
    stubFetch(async () => jsonResponse(400, { type: 'invalid_request', message: 'Bad thing', code: 'bad_thing', details: { a: 1 } }));

    await expect(client().post('/x', {})).rejects.toEqual({
      type: 'invalid_request',
      message: 'Bad thing',
      code: 'bad_thing',
      statusCode: 400,
      details: { a: 1 },
    });
  });

  it('reads the fields the API nests under error', async () => {
    stubFetch(async () =>
      jsonResponse(410, {
        error: {
          message: 'The 3D Secure session has expired',
          code: 'session_expired',
          meta: { errorCode: 'THREEDS_SESSION_EXPIRED' },
        },
      })
    );

    await expect(client().post('/x', {})).rejects.toEqual({
      type: 'api_error',
      message: 'The 3D Secure session has expired',
      code: 'session_expired',
      statusCode: 410,
      details: undefined,
    });
  });

  it('keeps the API validation details', async () => {
    const details = { body: [{ path: ['clientSecret'], message: 'Required' }] };
    stubFetch(async () => jsonResponse(400, { error: { message: 'Invalid request parameters', code: 'invalid_params', details } }));

    await expect(client().post('/x', {})).rejects.toMatchObject({ code: 'invalid_params', details, statusCode: 400 });
  });

  it('survives a body that is not an object', async () => {
    stubFetch(async () => jsonResponse(502, 'Bad Gateway'));

    await expect(client().post('/x', {})).rejects.toMatchObject({ type: 'api_error', statusCode: 502 });
  });

  it('reports a network error when no response arrives', async () => {
    stubFetch(async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(client().get('/x')).rejects.toEqual({
      type: 'network_error',
      message: 'No response received from server',
      statusCode: 0,
    });
  });

  it('aborts and reports a timeout', async () => {
    stubFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init.signal!.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    );
    const http = new HttpClient({ publicKey: 'pk_test_abc', baseURL: 'https://api.test/v1', timeout: 10 });

    await expect(http.get('/x')).rejects.toMatchObject({ type: 'network_error', statusCode: 0, message: 'Request timed out after 10ms' });
  });

  it('reports a client error when fetch does not exist', async () => {
    vi.stubGlobal('fetch', undefined);

    await expect(client().get('/x')).rejects.toMatchObject({ type: 'client_error' });
  });
});
