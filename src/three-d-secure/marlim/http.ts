import { Env } from './types';

const REQUEST_ERROR = 'Request error.';

export function apiBaseUrl(env: Env): string {
  return env === 'sandbox' ? 'https://sandbox.api.marlim.co' : 'https://api.marlim.co';
}

function normalizeCandidate(value: unknown): string | undefined {
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    const message = typeof item === 'string' ? item : item == null ? undefined : (item as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return undefined;
}

export function handleError(data: unknown): Error {
  if (data && typeof data === 'object') {
    const body = data as { message?: unknown; error?: unknown; errors?: unknown };
    return new Error(
      normalizeCandidate(body.message) ||
        normalizeCandidate(body.error) ||
        normalizeCandidate(body.errors) ||
        REQUEST_ERROR
    );
  }
  return new Error(REQUEST_ERROR);
}

function parseBody(text: string): unknown {
  if (text === '') return '';
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function abortError(): Error {
  const error = new Error('The user aborted a request.');
  error.name = 'AbortError';
  return error;
}

export async function postJson<T>(env: Env, path: string, token: string, body: unknown): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await new Promise<Response>((resolve, reject) => {
      const timeout = setTimeout(() => reject(abortError()), 10000);
      const fetchFn = typeof window !== 'undefined' && window.fetch ? window.fetch.bind(window) : fetch;
      fetchFn(`${apiBaseUrl(env)}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        credentials: 'omit',
      })
        .then(resolve, reject)
        .finally(() => clearTimeout(timeout));
    });

    const data = parseBody(await response.text());

    if (response.status >= 200 && response.status <= 299) {
      return data as T;
    }
    throw handleError(data);
  } catch (error) {
    if (error instanceof Error && error.name === 'Error') {
      throw error;
    }
    throw new Error(REQUEST_ERROR);
  } finally {
    clearTimeout(timer);
  }
}
