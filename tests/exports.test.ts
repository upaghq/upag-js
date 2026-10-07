import { describe, it, expect, expectTypeOf } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import * as sdk from '../src/index';
import { UpagJs } from '../src/client';
import type {
  Card,
  CheckoutSession,
  ConfirmCardPayment,
  CheckoutTrial,
  ConfirmCheckoutSessionParams,
  CreateCardParams,
  Price,
  Product,
} from '../src/index';

const REMOVED_TYPES = [
  'Customer',
  'CreateCustomerParams',
  'CreateCheckoutSessionParams',
  'PaymentMethod',
  'CreatePaymentMethodParams',
  'PaymentMethodType',
  'CheckoutPaymentMethod',
  'UpagEnvironment',
];

describe('public surface', () => {
  const upag = new UpagJs({ publicKey: 'pk_live_abc' }) as any;

  it('keeps cards, threeDSecure, checkout and antifraud at the top level', () => {
    expect(upag.cards).toBeDefined();
    expect(upag.threeDSecure).toBeDefined();
    expect(upag.checkout).toBeDefined();
    expect(upag.antifraud).toBeDefined();
    expect(upag.billing).toBeUndefined();
  });

  it('no longer exposes customers, payment methods or catalog', () => {
    for (const name of ['customers', 'paymentMethods', 'products', 'prices', 'billing']) {
      expect(upag[name], name).toBeUndefined();
    }
  });

  it('does not export removed resource classes', () => {
    for (const name of ['Customers', 'PaymentMethods', 'Billing', 'Products']) {
      expect((sdk as Record<string, unknown>)[name], name).toBeUndefined();
    }
    expect(sdk.Checkout).toBeDefined();
    expect(sdk.Antifraud).toBeDefined();
    expect((sdk as Record<string, unknown>).ShopifyCheckoutSnippet).toBeUndefined();
    expect((sdk as Record<string, unknown>).AntifraudSnippet).toBeUndefined();
  });

  it('does not offer merchant create or catalog list on checkout', () => {
    expect(upag.checkout.create).toBeUndefined();
    expect(upag.checkout.createSession).toBeUndefined();
    expect(upag.checkout.start).toBeTypeOf('function');
    expect(upag.checkout.retrieve).toBeTypeOf('function');
    expect(upag.checkout.confirm).toBeTypeOf('function');
  });

  it('types: Card and CreateCardParams use the API field names', () => {
    expectTypeOf<CreateCardParams>().toHaveProperty('expirationMonth');
    expectTypeOf<CreateCardParams>().not.toHaveProperty('customerId');
    expectTypeOf<Card>().toHaveProperty('lastDigits');
    expectTypeOf<Card>().toHaveProperty('customer');
    expectTypeOf<Card>().not.toHaveProperty('customerId');
  });

  it('types: dates that arrive as ISO strings are typed as string', () => {
    expectTypeOf<Card['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<Product['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<Price['updatedAt']>().toEqualTypeOf<string>();
    expectTypeOf<CheckoutSession['createdAt']>().toEqualTypeOf<string>();
  });

  it('types: confirm takes inline customer and payment, not customerId', () => {
    expectTypeOf<ConfirmCheckoutSessionParams>().toHaveProperty('customer');
    expectTypeOf<ConfirmCheckoutSessionParams>().toHaveProperty('charge');
    expectTypeOf<ConfirmCheckoutSessionParams>().not.toHaveProperty('customerId');
    expectTypeOf<CheckoutSession>().not.toHaveProperty('customerId');
    expectTypeOf<CheckoutSession>().toHaveProperty('customer');
    expectTypeOf<ConfirmCardPayment>().toHaveProperty('threeDSecureSession');
    expectTypeOf<ConfirmCardPayment>().not.toHaveProperty('threeDSecureSessionId');
  });

  it('types: a zero-due session confirms with paymentMethod, never with both keys', () => {
    const customer = { name: 'Jane', document: { type: 'cpf', number: '52998224725' } } as const;

    expectTypeOf<{ customer: typeof customer; charge: { method: 'pix' } }>().toMatchTypeOf<ConfirmCheckoutSessionParams>();
    expectTypeOf<{
      customer: typeof customer;
      paymentMethod: { type: 'card'; card: string };
    }>().toMatchTypeOf<ConfirmCheckoutSessionParams>();
    expectTypeOf<{ customer: typeof customer }>().toMatchTypeOf<ConfirmCheckoutSessionParams>();
    expectTypeOf<{
      customer: typeof customer;
      charge: { method: 'pix' };
      paymentMethod: { type: 'card'; card: string };
    }>().not.toMatchTypeOf<ConfirmCheckoutSessionParams>();
  });

  it('types: the shopper session exposes the trial and the payment method collection', () => {
    expectTypeOf<CheckoutSession['trial']>().toEqualTypeOf<CheckoutTrial | null>();
    expectTypeOf<CheckoutSession['paymentMethodCollection']>().toEqualTypeOf<'always' | 'if_required'>();
    expectTypeOf<CheckoutTrial['endsAt']>().toEqualTypeOf<string | null>();
  });

  it('removed types are not exported from the source entry', () => {
    const source = readFileSync('src/types/index.ts', 'utf8');
    for (const name of REMOVED_TYPES) {
      expect(source).not.toMatch(new RegExp(`export (interface|type) ${name}\\b`));
    }
  });

  it('removed types are not in the built declarations', () => {
    if (!existsSync('dist/index.d.ts')) return;
    const declarations = readFileSync('dist/index.d.ts', 'utf8');
    for (const name of REMOVED_TYPES) {
      expect(declarations).not.toMatch(new RegExp(`\\b(interface|type) ${name}\\b`));
    }
  });
});
