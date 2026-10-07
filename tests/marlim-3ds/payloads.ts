export const TOKEN = 'session-token';
export const CARD_ID = 'card_097v98z0djvnbwaaaai54mxqew';
export const SESSION_ID = 'sess_abc123';
export const AUTH_ID = '32WcjjJ8U445AUaaaafv01';
export const DATA_COLLECTION_URL = 'https://centinelapistag.cardinalcommerce.com/V2/Cruise/Collect';
export const CHALLENGE_URL = 'https://0merchantacsstag.cardinalcommerce.com/MerchantACS/challenge';

export function customer(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Jose Silva',
    document_number: '12345678909',
    email: 'jose.silva@example.com',
    phone: {
      number: '999999999',
      area_code: '11',
      country_code: '55',
    },
    address: {
      country: 'BR',
      state: 'SP',
      city: 'Sao Paulo',
      neighborhood: 'Centro',
      number: '123',
      street: 'Rua das Flores',
      zipcode: '01001000',
      complement: 'Apto 123',
    },
    ...overrides,
  };
}

export function farExpiry(): string {
  const year = (new Date().getFullYear() + 4) % 100;
  return `12${String(year).padStart(2, '0')}`;
}

export function monthOffsetExpiry(offset: number): string {
  const now = new Date();
  const monthIndex = now.getMonth() + offset;
  const date = new Date(now.getFullYear(), monthIndex, 1);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  return `${mm}${yy}`;
}

export function card(overrides: Record<string, unknown> = {}) {
  return {
    number: '4111111111111111',
    expiration_date: farExpiry(),
    cvv: '123',
    holder_name: 'Jose Silva',
    ...overrides,
  };
}

export function basePayload(overrides: Record<string, unknown> = {}) {
  return {
    amount: 1000,
    card: card(),
    customer: customer(),
    ...overrides,
  };
}

export function setupOk(overrides: Record<string, unknown> = {}) {
  return {
    card_id: CARD_ID,
    access_token: 'ddc-jwt',
    data_collection_url: DATA_COLLECTION_URL,
    session_id: SESSION_ID,
    ...overrides,
  };
}

export function authenticateOk(overrides: Record<string, unknown> = {}) {
  return {
    authentication_id: AUTH_ID,
    challenge: null,
    ...overrides,
  };
}

export function authenticateChallenge(windowSize = '01') {
  return {
    authentication_id: AUTH_ID,
    challenge: {
      url: CHALLENGE_URL,
      access_token: 'challenge-jwt',
      window_size: windowSize,
    },
  };
}
