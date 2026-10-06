import { UpagError, UpagJsConfig } from '../types';

export const API_PRODUCTION_URL = 'https://api.upag.io/v1';
export const API_SANDBOX_URL = 'https://api.upag.dev/v1';

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function invalidBaseURL(message: string): UpagError {
  return { type: 'client_error', code: 'invalid_base_url', message };
}

function validateBaseURL(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw invalidBaseURL('baseURL must be an absolute URL');
  }

  const isLocal = LOCAL_HOSTS.has(url.hostname);
  if (url.protocol === 'https:' || (url.protocol === 'http:' && isLocal)) return value;

  throw invalidBaseURL('baseURL must use https (http is only allowed for localhost)');
}

/**
 * Where the API lives for this client. Cards, 3D Secure and checkout share one
 * host (`/v1/...`). The API has no live mode of its own, so the host is the
 * environment: `pk_test_` → sandbox, anything else → production. `baseURL` wins.
 */
export function resolveEnvironment(publicKey: string): 'production' | 'sandbox' {
  return publicKey.startsWith('pk_test_') ? 'sandbox' : 'production';
}

export function resolveBaseURL(config: UpagJsConfig): string {
  if (config.baseURL) return validateBaseURL(config.baseURL);
  return resolveEnvironment(config.publicKey) === 'sandbox' ? API_SANDBOX_URL : API_PRODUCTION_URL;
}