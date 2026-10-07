import { UpagJsConfig, UpagError } from '../types';
import { resolveBaseURL, resolveEnvironment } from './api-base-url';

const DEFAULT_TIMEOUT_MS = 30000;

export interface RequestOptions {
  /** Extra headers for this request only. */
  headers?: Record<string, string>;
  /**
   * Who authorizes this request. Default is the client's public key.
   * `"none"` omits `Authorization` (public payment-link start).
   * `{ clientSecret }` is the shopper credential for one checkout session.
   */
  auth?: 'none' | { clientSecret: string };
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

class TimeoutSignal extends Error { }

export class HttpClient {
  readonly environment: 'production' | 'sandbox';
  readonly publicKey: string;
  private baseURL: string;
  private timeout: number;
  private headers: Record<string, string>;

  constructor(config: UpagJsConfig) {
    this.environment = resolveEnvironment(config.publicKey);
    this.publicKey = config.publicKey;
    this.baseURL = resolveBaseURL(config);
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;
    this.headers = {
      'Authorization': `Bearer ${config.publicKey}`,
      'Content-Type': 'application/json',
    };
  }

  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('GET', url, undefined, options);
  }

  async post<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('POST', url, data, options);
  }

  async put<T>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.request<T>('PUT', url, data, options);
  }

  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>('DELETE', url, undefined, options);
  }

  private async request<T>(method: Method, url: string, data?: any, options?: RequestOptions): Promise<T> {
    if (typeof globalThis.fetch !== 'function') {
      throw this.clientError('fetch is not available in this environment');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new TimeoutSignal()), this.timeout);

    let response: Response;
    try {
      response = await globalThis.fetch(this.buildUrl(url), {
        method,
        headers: this.buildHeaders(options),
        body: data === undefined ? undefined : JSON.stringify(data),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timer);
      throw this.handleFetchError(error, controller.signal);
    }

    try {
      const body = await this.readBody(response);
      if (!response.ok) {
        throw this.handleErrorResponse(response.status, body);
      }
      return body as T;
    } catch (error) {
      if (this.isUpagError(error)) throw error;
      throw this.handleFetchError(error, controller.signal);
    } finally {
      clearTimeout(timer);
    }
  }

  private buildHeaders(options?: RequestOptions): Record<string, string> {
    const headers = { ...this.headers, ...options?.headers };
    if (options?.auth === 'none') {
      delete headers.Authorization;
      return headers;
    }
    if (options?.auth && typeof options.auth === 'object') {
      headers.Authorization = `Bearer ${options.auth.clientSecret}`;
    }
    return headers;
  }

  private buildUrl(url: string): string {
    if (/^https?:\/\//i.test(url)) return url;
    return `${this.baseURL.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
  }

  /** JSON when the body parses as JSON, the raw text otherwise, undefined when empty. */
  private async readBody(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private handleErrorResponse(status: number, data: any): UpagError {
    // Billing answers with the fields at the top of the body; the rest of the API nests them
    // under `error`. Both are read the same way.
    const body: any = data?.error && typeof data.error === 'object' ? data.error : data;
    return {
      type: body?.type || 'api_error',
      message: body?.message || `Request failed with status code ${status}`,
      code: body?.code,
      statusCode: status,
      details: body?.details,
    };
  }

  private handleFetchError(error: unknown, signal: AbortSignal): UpagError {
    if (signal.aborted) {
      return {
        type: 'network_error',
        message: `Request timed out after ${this.timeout}ms`,
        statusCode: 0,
      };
    }
    // fetch rejects with a TypeError when no response arrives (offline, DNS, CORS).
    if (error instanceof TypeError) {
      return {
        type: 'network_error',
        message: 'No response received from server',
        statusCode: 0,
      };
    }
    return this.clientError(error instanceof Error ? error.message : String(error));
  }

  private clientError(message: string): UpagError {
    return { type: 'client_error', message };
  }

  private isUpagError(error: unknown): error is UpagError {
    return typeof error === 'object' && error !== null && 'type' in error && 'message' in error
      && !(error instanceof Error);
  }
}
