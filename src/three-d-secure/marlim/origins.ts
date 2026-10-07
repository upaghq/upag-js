import { Env } from './types';

const DDC_ORIGINS: Record<Env, string[]> = {
  sandbox: [
    'https://centinelapistag.cardinalcommerce.com',
    'https://geostag.cardinalcommerce.com',
    'https://cas.client.cardinaltrusted.com',
  ],
  production: ['https://centinelapi.cardinalcommerce.com', 'https://geo.cardinalcommerce.com'],
};

function defaultCentinel(env: Env): string {
  return env === 'sandbox'
    ? 'https://centinelapistag.cardinalcommerce.com'
    : 'https://centinelapi.cardinalcommerce.com';
}

export function ddcAllowedOrigins(env: Env, dataCollectionUrl: string): Set<string> {
  const origins = new Set(DDC_ORIGINS[env]);
  origins.add(defaultCentinel(env));
  try {
    origins.add(new URL(dataCollectionUrl).origin);
  } catch {
    /* ignore unparseable collection URLs, matching the oracle */
  }
  return origins;
}

export function marlimApiOrigin(env: Env): string | null {
  const base = env === 'sandbox' ? 'https://sandbox.api.marlim.co' : 'https://api.marlim.co';
  try {
    return new URL(base).origin;
  } catch {
    return null;
  }
}

export function parseMessageData(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
}
