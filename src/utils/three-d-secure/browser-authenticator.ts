/**
 * Loads the browser authentication module used for 3D Secure.
 *
 * The module is first-party (`src/three-d-secure/marlim`) and bundled into upag-js
 * at build time. It is loaded lazily, only when a 3D Secure authentication actually
 * starts. This keeps SSR safe (nothing touches `window` on import).
 */

export interface BrowserAuthenticatorInitConfig {
  token: string;
  env: 'sandbox' | 'production';
}

export interface BrowserAuthenticator {
  init(config: BrowserAuthenticatorInitConfig): unknown;
  authenticate(payload: Record<string, unknown>): Promise<Record<string, unknown>>;
}

export type BrowserAuthenticatorLoader = () => Promise<BrowserAuthenticator>;

const GLOBAL_NAME = 'UpagSDK_3DS';

let cached: Promise<BrowserAuthenticator> | null = null;

function pick(value: any): BrowserAuthenticator | null {
  const candidates = [value, value?.default, value?.[GLOBAL_NAME], value?.default?.[GLOBAL_NAME]];
  for (const candidate of candidates) {
    if (
      candidate &&
      typeof candidate.init === 'function' &&
      typeof candidate.authenticate === 'function'
    ) {
      return candidate as BrowserAuthenticator;
    }
  }
  return null;
}

export const loadBrowserAuthenticator: BrowserAuthenticatorLoader = () => {
  if (!cached) {
    cached = (async () => {
      const globals = globalThis as Record<string, unknown>;
      const hadGlobal = Object.prototype.hasOwnProperty.call(globals, GLOBAL_NAME);

      const mod = await import('../../three-d-secure/marlim');
      const authenticator = pick(mod) ?? pick(globals[GLOBAL_NAME]);

      // If importing the module registered a global, remove it so nothing is exposed on the page.
      if (!hadGlobal && Object.prototype.hasOwnProperty.call(globals, GLOBAL_NAME)) {
        try {
          delete globals[GLOBAL_NAME];
        } catch {
          globals[GLOBAL_NAME] = undefined;
        }
      }

      if (!authenticator) {
        throw new Error('3D Secure module could not be initialized');
      }
      return authenticator;
    })().catch((error) => {
      cached = null;
      throw error;
    });
  }
  return cached;
};
