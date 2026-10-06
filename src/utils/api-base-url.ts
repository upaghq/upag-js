import { UpagJsConfig } from '../types';

export const API_PRODUCTION_URL = 'https://api.upag.io/v1';
export const API_SANDBOX_URL = 'https://api.upag.dev/v1';

/**
 * Where the API lives for this client. The API has no live mode of its own:
 * the environment is the URL. In order: an explicit `baseURL`, an explicit
 * `environment`, the environment the key was issued for, then production.
 */
export function resolveBaseURL(config: UpagJsConfig): string {
  if (config.baseURL) return config.baseURL;
  if (config.environment === 'sandbox') return API_SANDBOX_URL;
  if (config.environment === 'production') return API_PRODUCTION_URL;
  if (config.publicKey.startsWith('pk_test_')) return API_SANDBOX_URL;
  return API_PRODUCTION_URL;
}
