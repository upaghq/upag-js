import { describe, it, expect, vi, afterEach } from 'vitest';
import { UpagJs } from '../src/client';
import { Checkout } from '../src/resources/checkout';

const BASE = 'https://api.upag.io/v1';
const SECRET = 'session-id_secret_abc';
const SESSION_ID = '11111111-1111-4111-8111-111111111111';

const PAYLOAD = {
  clientSecret: SECRET,
  checkoutSession: { id: SESSION_ID, url: 'https://checkout.test/cs/1', status: 'open' },
  paymentMethods: [{ type: 'pix' }],
  account: { displayName: 'Store', legalName: null, email: null },
  layout: null,
  publishableKey: 'pk_live_abc',
  payment: null,
};

const CONFIRM = {
  customer: {
    name: 'Jane Doe',
    document: { type: 'cpf' as const, number: '52998224725' },
  },
  payment: { method: 'pix' as const },
};

function stubFetch(body: unknown = PAYLOAD) {
  const fetchMock = vi.fn(async (_url: string, _init: RequestInit) => new Response(JSON.stringify(body), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls[fetchMock.mock.calls.length - 1]!;
  return {
    url,
    method: init!.method,
    body: init!.body ? JSON.parse(init!.body as string) : undefined,
    authorization: (init!.headers as Record<string, string>).Authorization,
  };
}

const upag = new UpagJs({ publicKey: 'pk_live_abc' });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkout', () => {
  it('is a Checkout instance on the client', () => {
    expect(upag.checkout).toBeInstanceOf(Checkout);
  });

  it('start posts to the payment-link route with no Authorization', async () => {
    const fetchMock = stubFetch();
    const tracking = { utmSource: 'ads', clickId: 'c1' };

    const payload = await upag.checkout.start('link-code', tracking);

    expect(payload.clientSecret).toBe(SECRET);
    expect(lastCall(fetchMock)).toEqual({
      url: `${BASE}/checkout/payment-links/link-code/sessions`,
      method: 'POST',
      body: tracking,
      authorization: undefined,
    });
  });

  it('retrieve, confirm and coupon send the client secret, not the public key', async () => {
    const fetchMock = stubFetch({ ...PAYLOAD, clientSecret: undefined });

    await upag.checkout.retrieve(SESSION_ID, SECRET);
    expect(lastCall(fetchMock)).toEqual({
      url: `${BASE}/checkout/sessions/${SESSION_ID}`,
      method: 'GET',
      body: undefined,
      authorization: `Bearer ${SECRET}`,
    });

    await upag.checkout.confirm(SESSION_ID, SECRET, CONFIRM);
    expect(lastCall(fetchMock)).toEqual({
      url: `${BASE}/checkout/sessions/${SESSION_ID}/confirm`,
      method: 'POST',
      body: CONFIRM,
      authorization: `Bearer ${SECRET}`,
    });

    await upag.checkout.applyCoupon(SESSION_ID, SECRET, { code: 'SAVE10' });
    expect(lastCall(fetchMock)).toEqual({
      url: `${BASE}/checkout/sessions/${SESSION_ID}/coupon`,
      method: 'POST',
      body: { code: 'SAVE10' },
      authorization: `Bearer ${SECRET}`,
    });

    await upag.checkout.removeCoupon(SESSION_ID, SECRET);
    expect(lastCall(fetchMock)).toEqual({
      url: `${BASE}/checkout/sessions/${SESSION_ID}/coupon`,
      method: 'DELETE',
      body: undefined,
      authorization: `Bearer ${SECRET}`,
    });
  });

  it('confirm sends pix or card, never priceId or credit_card', async () => {
    const fetchMock = stubFetch({ ...PAYLOAD, clientSecret: undefined });
    const cardConfirm = {
      customer: CONFIRM.customer,
      bumps: ['22222222-2222-4222-8222-222222222222'],
      payment: { method: 'card' as const, card: '33333333-3333-4333-8333-333333333333', installments: 2 },
    };

    await upag.checkout.confirm(SESSION_ID, SECRET, cardConfirm);

    const body = lastCall(fetchMock).body as typeof cardConfirm;
    expect(body.payment).toEqual(cardConfirm.payment);
    expect(body).not.toHaveProperty('priceId');
    expect(JSON.stringify(body)).not.toContain('credit_card');
  });

  it('redirectToCheckout starts the session and navigates', async () => {
    stubFetch();
    const location = { href: '' };
    vi.stubGlobal('window', { location });

    await upag.checkout.redirectToCheckout('link-code');

    expect(location.href).toBe('https://checkout.test/cs/1');
  });
});

describe('top-level resources', () => {
  it('cards.create posts to /cards with the public key', async () => {
    const fetchMock = stubFetch({ id: 'card_1' });

    await upag.cards.create({
      number: '4242424242424242',
      expirationMonth: 12,
      expirationYear: 2099,
      cvv: '123',
      holderName: 'John Doe',
    });

    const call = lastCall(fetchMock);
    expect(call.url).toBe(`${BASE}/cards`);
    expect(call.method).toBe('POST');
    expect(call.authorization).toBe('Bearer pk_live_abc');
  });

  it('threeDSecure talks to /3ds on the same host', () => {
    const tds = upag.threeDSecure as any;

    expect(tds.basePath).toBe('/3ds');
    expect(tds.http).toBe((upag as any).http);
  });
});
