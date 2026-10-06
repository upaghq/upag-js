import { describe, it, expect, expectTypeOf } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import * as sdk from '../src/index';
import { UpagJs } from '../src/client';
import type {
  Card,
  CheckoutSession,
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
  });

  it('types: dates that arrive as ISO strings are typed as string', () => {
    expectTypeOf<Card['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<Product['createdAt']>().toEqualTypeOf<string>();
    expectTypeOf<Price['updatedAt']>().toEqualTypeOf<string>();
    expectTypeOf<CheckoutSession['createdAt']>().toEqualTypeOf<string>();
  });

  it('types: confirm takes inline customer and payment, not customerId', () => {
    expectTypeOf<ConfirmCheckoutSessionParams>().toHaveProperty('customer');
    expectTypeOf<ConfirmCheckoutSessionParams>().toHaveProperty('payment');
    expectTypeOf<ConfirmCheckoutSessionParams>().not.toHaveProperty('customerId');
    expectTypeOf<CheckoutSession>().not.toHaveProperty('customerId');
    expectTypeOf<CheckoutSession>().toHaveProperty('customer');
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
