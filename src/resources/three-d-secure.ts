import { BaseResource } from './base-resource';
import { HttpClient } from '../utils/http-client';
import {
  BrowserAuthenticator,
  BrowserAuthenticatorLoader,
  loadBrowserAuthenticator,
} from '../utils/three-d-secure/browser-authenticator';
import { watchChallengeDismissal } from '../utils/three-d-secure/challenge-watcher';
import {
  AuthenticateThreeDSecureParams,
  ThreeDSecureOptions,
  ThreeDSecureProgress,
  ThreeDSecureResult,
  ThreeDSecureSession,
  UpagError,
} from '../types';

const DEFAULT_TIMEOUT_MS = 10 * 60 * 1000;
const DEFAULT_DISMISS_GRACE_MS = 1500;

type Outcome = 'completed' | 'canceled' | 'timeout' | 'failed';

interface ThreeDSecureTiming {
  dismissGraceMs: number;
}

// The authentication module keeps global state, so only one authentication may run at a time.
let inFlight = false;

function threeDSecureError(code: string, message: string, details?: Record<string, unknown>): UpagError {
  return { type: 'three_d_secure_error', code, message, ...(details ? { details } : {}) };
}

function clientError(code: string, message: string): UpagError {
  return { type: 'client_error', code, message };
}

class Interrupted extends Error {
  constructor(public readonly outcome: 'canceled' | 'timeout') {
    super(outcome);
  }
}

export class ThreeDSecure extends BaseResource {
  private readonly loadAuthenticator: BrowserAuthenticatorLoader;
  private readonly timing: ThreeDSecureTiming;

  constructor(
    http: HttpClient,
    loader: BrowserAuthenticatorLoader = loadBrowserAuthenticator,
    timing: Partial<ThreeDSecureTiming> = {}
  ) {
    super(http, '/3ds');
    this.loadAuthenticator = loader;
    this.timing = { dismissGraceMs: timing.dismissGraceMs ?? DEFAULT_DISMISS_GRACE_MS };
  }

  /**
   * Runs the 3D Secure authentication of a session your server created, in the browser.
   * Resolves with the session id, to be sent to your backend as `threeDSecureSessionId`
   * when it creates the charge.
   */
  async authenticate(
    params: AuthenticateThreeDSecureParams,
    options: ThreeDSecureOptions = {}
  ): Promise<ThreeDSecureResult> {
    const clientSecret = this.validate(params);

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw clientError('unsupported_environment', '3D Secure authentication is only available in browser environments');
    }
    if (inFlight) {
      throw clientError('authentication_in_progress', 'A 3D Secure authentication is already in progress');
    }

    inFlight = true;
    const emit = (status: ThreeDSecureProgress) => {
      try {
        options.onStatusChange?.(status);
      } catch {
        /* integrator callbacks must not break the flow */
      }
    };

    try {
      emit('starting');

      // Load the authentication module while the session is being started.
      const authenticatorPromise = this.loadAuthenticator();
      authenticatorPromise.catch(() => undefined);

      // Starting is idempotent on the server, so a retry is safe and needs no key.
      const session = await this.http.post<ThreeDSecureSession>(this.actionUrl('start'), { clientSecret });

      if (session?.status === 'completed' && session.id) {
        return { sessionId: session.id, status: 'completed' };
      }

      const action = session?.nextAction;
      if (
        !session?.id ||
        session.status !== 'requires_action' ||
        !action ||
        action.type !== 'browser_authentication' ||
        !action.token ||
        !action.payload
      ) {
        throw threeDSecureError('invalid_response', 'Unexpected response while starting the 3D Secure session');
      }

      // The secret carries no session id: the server names the session when it is started.
      const sessionId = session.id;

      emit('authenticating');

      let authenticator: BrowserAuthenticator;
      try {
        authenticator = await authenticatorPromise;
      } catch {
        await this.safeComplete(clientSecret, 'failed', 'authentication_unavailable');
        throw threeDSecureError('authentication_unavailable', '3D Secure authentication is temporarily unavailable', {
          sessionId,
        });
      }

      let result: Record<string, unknown>;
      try {
        await authenticator.init({ token: action.token, env: action.environment });
        result = await this.runGuarded(
          () => authenticator.authenticate(action.payload),
          options.timeoutMs ?? DEFAULT_TIMEOUT_MS
        );
      } catch (error) {
        const failure = this.mapAuthenticationError(error, sessionId);
        await this.safeComplete(clientSecret, failure.outcome, failure.error.code);
        throw failure.error;
      }

      emit('completing');
      const completed = await this.http.post<ThreeDSecureSession>(this.actionUrl('complete'), {
        clientSecret,
        outcome: 'completed',
        result,
      });

      if (completed?.status !== 'completed') {
        throw threeDSecureError('authentication_failed', 'The card could not be authenticated', {
          sessionId,
        });
      }

      return { sessionId: completed.id || sessionId, status: 'completed' };
    } finally {
      inFlight = false;
      emit('idle');
    }
  }

  private validate(params: AuthenticateThreeDSecureParams): string {
    if (!params || typeof params !== 'object') {
      throw clientError('invalid_params', 'Authentication params are required');
    }
    const clientSecret = params.clientSecret;
    if (!clientSecret || typeof clientSecret !== 'string') {
      throw clientError('invalid_params', 'clientSecret is required');
    }

    return clientSecret;
  }

  /** Races the module's promise against a global timeout and challenge dismissal. */
  private runGuarded<T>(run: () => Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      let settled = false;
      const finish = (fn: () => void) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        stopWatching();
        fn();
      };

      const timer = setTimeout(() => finish(() => reject(new Interrupted('timeout'))), timeoutMs);
      const stopWatching = watchChallengeDismissal(
        () => finish(() => reject(new Interrupted('canceled'))),
        this.timing.dismissGraceMs
      );

      Promise.resolve()
        .then(run)
        .then(
          (value) => finish(() => resolve(value)),
          (error) => finish(() => reject(error))
        );
    });
  }

  private mapAuthenticationError(error: unknown, sessionId: string): { outcome: Outcome; error: UpagError } {
    if (error instanceof Interrupted && error.outcome === 'canceled') {
      return {
        outcome: 'canceled',
        error: threeDSecureError('authentication_canceled', 'The buyer canceled the 3D Secure authentication', { sessionId }),
      };
    }
    if (error instanceof Interrupted && error.outcome === 'timeout') {
      return {
        outcome: 'timeout',
        error: threeDSecureError('authentication_timeout', 'The 3D Secure authentication timed out', { sessionId }),
      };
    }
    // Errors from the authentication module are never forwarded as-is.
    return {
      outcome: 'failed',
      error: threeDSecureError('authentication_failed', 'The card could not be authenticated', { sessionId }),
    };
  }

  private actionUrl(action: 'start' | 'complete'): string {
    return this.buildUrl(`sessions/${action}`);
  }

  private async safeComplete(
    clientSecret: string,
    outcome: Outcome,
    failureCode?: string
  ): Promise<void> {
    try {
      await this.http.post(this.actionUrl('complete'), {
        clientSecret,
        outcome,
        ...(failureCode ? { failureCode } : {}),
      });
    } catch {
      /* best effort: the server also expires abandoned sessions */
    }
  }
}
