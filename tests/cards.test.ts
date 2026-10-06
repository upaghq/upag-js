import { describe, it, expect, vi } from 'vitest';
import { UpagJs } from '../src/client';
import { Cards } from '../src/resources/cards';

const CARD = {
  id: '6f1c2f0e-7c1b-4f0e-9d53-0d6c0c3b1a11',
  customerId: null,
  brand: 'visa',
  firstDigits: '424242',
  lastDigits: '4242',
  holderName: 'JOHN DOE',
  expirationMonth: 12,
  expirationYear: 2030,
  funding: 'credit',
  wallet: null,
  status: 'active',
  createdAt: '2026-10-01T13:00:00.000Z',
  updatedAt: '2026-10-01T13:00:00.000Z',
};

const PARAMS = {
  number: '4242424242424242',
  expirationMonth: 12,
  expirationYear: 2030,
  cvv: '123',
  holderName: 'John Doe',
};

function makeHttp() {
  return { post: vi.fn(async () => CARD) } as any;
}

describe('Cards', () => {
  it('is exposed on the client and shares its http client', () => {
    const upag = new UpagJs({ publicKey: 'pk_test_abc', environment: 'sandbox' }) as any;

    expect(upag.cards).toBeInstanceOf(Cards);
    expect(upag.cards.http).toBe(upag.http);
  });

  it('posts the card to /cards and returns the tokenized card', async () => {
    const http = makeHttp();

    const card = await new Cards(http).create(PARAMS);

    expect(card).toEqual(CARD);
    expect(http.post).toHaveBeenCalledTimes(1);
    expect(http.post).toHaveBeenCalledWith('/cards', PARAMS, undefined);
  });

  it('sends the idempotency key as a header when given', async () => {
    const http = makeHttp();

    await new Cards(http).create(PARAMS, { idempotencyKey: 'order_42' });

    expect(http.post).toHaveBeenCalledWith('/cards', PARAMS, {
      headers: { 'Idempotency-Key': 'order_42' },
    });
  });

  it('does not send the header for an empty idempotency key', async () => {
    const http = makeHttp();

    await new Cards(http).create(PARAMS, { idempotencyKey: '' });

    expect(http.post).toHaveBeenCalledWith('/cards', PARAMS, undefined);
  });

  it('lets API errors through untouched', async () => {
    const error = { type: 'api_error', code: 'too_many_attempts', statusCode: 429 };
    const http = { post: vi.fn(async () => Promise.reject(error)) } as any;

    await expect(new Cards(http).create(PARAMS)).rejects.toBe(error);
  });
});
