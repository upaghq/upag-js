import { applyAliases } from './aliases';
import { Env, InitConfig, ParsedAuthenticate } from './types';

function fail(message: string): never {
  throw new Error(message);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function requireString(value: unknown, message: string): string {
  if (typeof value !== 'string') fail(message);
  return value;
}

function optionalString(value: unknown, message: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, message);
}

function isExpirationValid(expirationDate: string): boolean {
  if (!/^(0[1-9]|1[0-2])\d{2}$/.test(expirationDate)) return false;
  const month = parseInt(expirationDate.substring(0, 2), 10);
  const year = 2000 + parseInt(expirationDate.substring(2), 10);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  return !(year < currentYear) && !(year === currentYear && month < currentMonth);
}

export function validateInit(config: unknown): InitConfig {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    throw new Error('ThreeDS can only be called in a browser environment.');
  }
  if (!isObject(config)) fail('token is required');
  const token = requireString(config.token, 'token is required');
  if (config.env !== 'sandbox' && config.env !== 'production') {
    fail('env is required and only sandbox or production are supported');
  }
  return { token, env: config.env };
}

export function validateAuthenticate(input: unknown, env: Env): ParsedAuthenticate {
  const aliased = applyAliases(input);
  if (!isObject(aliased)) fail('Amount is required');

  const amount = aliased.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount)) {
    fail('Amount is required');
  }

  let soft_descriptor_challenge = optionalString(
    aliased.soft_descriptor_challenge,
    'Soft descriptor challenge must not be empty'
  );
  if (soft_descriptor_challenge !== undefined) {
    soft_descriptor_challenge = soft_descriptor_challenge.trim();
    if (soft_descriptor_challenge.length < 1) {
      fail('Soft descriptor challenge must not be empty');
    }
    if (soft_descriptor_challenge.length > 30) {
      fail('Soft descriptor challenge must be at most 30 characters long');
    }
    if (!/^[A-Za-z0-9 ]+$/.test(soft_descriptor_challenge)) {
      fail('Soft descriptor challenge must not contain special characters');
    }
  }

  let card_id = optionalString(aliased.card_id, 'Card ID must not be empty');
  if (card_id !== undefined) {
    card_id = card_id.trim();
    if (card_id.length < 1) fail('Card ID must not be empty');
  }

  const card_hash = optionalString(aliased.card_hash, 'card_hash must be a string');

  let card: ParsedAuthenticate['card'];
  if (aliased.card !== undefined) {
    if (!isObject(aliased.card)) fail('Card number is required');
    const number = requireString(aliased.card.number, 'Card number is required');
    const expiration_date = requireString(aliased.card.expiration_date, 'Invalid expiration date');
    if (!isExpirationValid(expiration_date)) fail('Invalid expiration date');
    const cvv = requireString(aliased.card.cvv, 'CVV is required');
    if (!/^\d{3,4}$/.test(cvv)) fail('CVV must be 3 or 4 digits');
    const holder_name = requireString(aliased.card.holder_name, 'Holder name is required');
    card = { number, expiration_date, cvv, holder_name };
  }

  if (!isObject(aliased.customer)) fail('Name is required');
  const customerRaw = aliased.customer;
  const name = requireString(customerRaw.name, 'Name is required');
  const document_number = requireString(customerRaw.document_number, 'Document number is required');
  if (!/^\d+$/.test(document_number)) {
    fail('Document number must not contain special characters');
  }
  const email = requireString(customerRaw.email, 'Invalid email');

  if (!isObject(customerRaw.phone)) fail('Phone number is required');
  const phone = {
    number: requireString(customerRaw.phone.number, 'Phone number is required'),
    area_code: requireString(customerRaw.phone.area_code, 'Area code is required'),
    country_code: requireString(customerRaw.phone.country_code, 'Country code is required'),
  };

  if (!isObject(customerRaw.address)) fail('Country is required');
  const addressRaw = customerRaw.address;
  const complement = optionalString(addressRaw.complement, 'complement must be a string');
  const address = {
    country: requireString(addressRaw.country, 'Country is required'),
    state: requireString(addressRaw.state, 'State is required'),
    city: requireString(addressRaw.city, 'City is required'),
    neighborhood: requireString(addressRaw.neighborhood, 'Neighborhood is required'),
    number: requireString(addressRaw.number, 'Number is required'),
    street: requireString(addressRaw.street, 'Street is required'),
    zipcode: requireString(addressRaw.zipcode, 'Zipcode is required'),
    ...(complement !== undefined ? { complement } : {}),
  };

  let challenge: boolean | undefined;
  if (env === 'sandbox') {
    if (aliased.challenge === undefined) {
      challenge = false;
    } else if (typeof aliased.challenge !== 'boolean') {
      fail('challenge must be a boolean');
    } else {
      challenge = aliased.challenge;
    }
  } else if (aliased.challenge !== undefined) {
    fail("The field 'challenge' is only allowed in test environments.");
  }

  const parsed: ParsedAuthenticate = {
    amount,
    customer: { name, document_number, email, phone, address },
    ...(challenge !== undefined ? { challenge } : {}),
    ...(soft_descriptor_challenge !== undefined ? { soft_descriptor_challenge } : {}),
    ...(card_id !== undefined ? { card_id } : {}),
    ...(card_hash !== undefined ? { card_hash } : {}),
    ...(card !== undefined ? { card } : {}),
  };

  if (!(parsed.card_id || parsed.card_hash || parsed.card)) {
    fail('At least one of card_id, card_hash, or card must be provided');
  }
  if ([parsed.card_id, parsed.card_hash, parsed.card].filter(Boolean).length !== 1) {
    fail('Only one of card_id, card_hash, or card can be provided');
  }

  return parsed;
}
