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
 * host (`/v1/...`). The API has no live mode of its own, so the environment is
 * the URL. In order: an explicit `baseURL`, then `environment`, then production.
 * The key is never used to pick the environment.
 */
export function resolveBaseURL(config: UpagJsConfig): string {
  if (config.baseURL) return validateBaseURL(config.baseURL);
  if (config.environment === undefined || config.environment === 'production') return API_PRODUCTION_URL;
  if (config.environment === 'sandbox') return API_SANDBOX_URL;

  throw invalidBaseURL("environment must be 'production' or 'sandbox'");
}

/**
 * Refuses a key issued for the other environment, so a `pk_test_` key left on the
 * default (production) fails here instead of as a 401 on the first request.
 * Skipped when `baseURL` is set, since the target is then the caller's choice.
 */
export function assertKeyMatchesEnvironment(config: UpagJsConfig): void {
  if (config.baseURL) return;
  const environment = config.environment ?? 'production';

  if (config.publicKey.startsWith('pk_test_') && environment === 'production') {
    throw {
      type: 'client_error',
      code: 'environment_mismatch',
      message: "A pk_test_ key belongs to the sandbox. Pass environment: 'sandbox'.",
    } satisfies UpagError;
  }
  if (config.publicKey.startsWith('pk_live_') && environment === 'sandbox') {
    throw {
      type: 'client_error',
      code: 'environment_mismatch',
      message: "A pk_live_ key belongs to production. Remove environment: 'sandbox'.",
    } satisfies UpagError;
  }
}
