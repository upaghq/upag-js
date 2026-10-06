import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vi } from 'vitest';

const FIXTURE = join(dirname(fileURLToPath(import.meta.url)), '../fixtures/marlim-3ds-sdk-1.1.0.min.js');
const ORACLE_SOURCE = readFileSync(FIXTURE, 'utf8');

export interface Sdk {
  init: (config: unknown) => unknown;
  authenticate: (payload: unknown) => Promise<unknown>;
}

export interface CapturedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

export interface CapturedSubmit {
  action: string;
  target: string;
  id: string;
  fields: Array<{ name: string; value: string; type: string }>;
}

export interface CapturedListener {
  target: 'window' | 'document';
  op: 'add' | 'remove';
  type: string;
  capture: boolean;
}

export interface CapturedConsole {
  level: 'log' | 'warn' | 'error';
  args: unknown[];
}

export interface Trace {
  requests: CapturedRequest[];
  submits: CapturedSubmit[];
  listeners: CapturedListener[];
  consoles: CapturedConsole[];
  snapshots: Record<string, string>;
  result:
    | { status: 'resolved'; value: unknown }
    | { status: 'rejected'; kind: 'Error' | 'string' | 'other'; message: string }
    | { status: 'pending' };
}

export interface World {
  window: Window & typeof globalThis;
  document: Document;
  trace: Trace;
  snapshot: (name: string) => void;
}

const HEADER_KEYS = ['accept', 'content-type', 'authorization'];

export function canonicalizeHeaders(headers: Headers | Record<string, string>): Record<string, string> {
  const raw: Record<string, string> = headers instanceof Headers ? Object.fromEntries(headers.entries()) : headers;
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const lower = key.toLowerCase();
    if (HEADER_KEYS.includes(lower)) next[lower] = value;
  }
  return next;
}

export function emptyTrace(): Trace {
  return {
    requests: [],
    submits: [],
    listeners: [],
    consoles: [],
    snapshots: {},
    result: { status: 'pending' },
  };
}

function captureBoolean(options?: boolean | { capture?: boolean }): boolean {
  if (typeof options === 'boolean') return options;
  return !!options?.capture;
}

interface TrackedListener {
  target: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject;
  options?: boolean | AddEventListenerOptions;
}

function installSpies(trace: Trace): () => void {
  const formProto = HTMLFormElement.prototype;
  const originalSubmit = formProto.submit;
  formProto.submit = function submit(this: HTMLFormElement) {
    const fields = Array.from(this.elements).map((element) => {
      const input = element as HTMLInputElement;
      return { name: input.name, value: input.value, type: input.type };
    });
    trace.submits.push({
      action: this.getAttribute('action') || this.action,
      target: this.target,
      id: this.id,
      fields,
    });
  };

  const tracked: TrackedListener[] = [];

  const wrap = (target: EventTarget, label: 'window' | 'document') => {
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    target.addEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) => {
      trace.listeners.push({ target: label, op: 'add', type, capture: captureBoolean(options) });
      tracked.push({ target, type, listener, options });
      return add(type, listener, options);
    };
    target.removeEventListener = (type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions) => {
      trace.listeners.push({ target: label, op: 'remove', type, capture: captureBoolean(options) });
      return remove(type, listener, options);
    };
    return () => {
      target.addEventListener = add;
      target.removeEventListener = remove;
      for (const item of tracked) {
        if (item.target === target) {
          remove(item.type, item.listener, item.options);
        }
      }
    };
  };

  const restoreWindow = wrap(window, 'window');
  const restoreDocument = wrap(document, 'document');

  const levels = ['log', 'warn', 'error'] as const;
  const originalConsole: Record<(typeof levels)[number], typeof console.log> = {
    log: console.log,
    warn: console.warn,
    error: console.error,
  };
  for (const level of levels) {
    console[level] = (...args: unknown[]) => {
      trace.consoles.push({ level, args });
    };
  }

  return () => {
    formProto.submit = originalSubmit;
    restoreWindow();
    restoreDocument();
    for (const level of levels) console[level] = originalConsole[level];
  };
}

function resetDocument(): void {
  document.documentElement.innerHTML = '<head></head><body></body>';
  const w = window as Window & { challengeModalKeyHandler?: unknown; MarlimSDK_3DS?: unknown };
  delete w.challengeModalKeyHandler;
  delete w.MarlimSDK_3DS;
}

export async function withWorld<T>(run: (world: World) => Promise<T>): Promise<T> {
  resetDocument();
  Object.defineProperty(window.screen, 'colorDepth', { configurable: true, value: 24 });
  Object.defineProperty(window.screen, 'width', { configurable: true, value: 1440 });
  Object.defineProperty(window.screen, 'height', { configurable: true, value: 900 });
  window.innerWidth = 1280;
  window.innerHeight = 800;

  const trace = emptyTrace();
  const restoreSpies = installSpies(trace);
  const world: World = {
    window: window as Window & typeof globalThis,
    document,
    trace,
    snapshot: (name) => {
      trace.snapshots[name] = document.documentElement.outerHTML;
    },
  };

  try {
    return await run(world);
  } finally {
    restoreSpies();
    resetDocument();
  }
}

export function loadOracle(world: World): Sdk {
  world.window.eval(ORACLE_SOURCE);
  const sdk = (world.window as unknown as { MarlimSDK_3DS: Sdk }).MarlimSDK_3DS;
  if (!sdk?.init || !sdk?.authenticate) {
    throw new Error('Oracle did not expose MarlimSDK_3DS');
  }
  return sdk;
}

export async function loadPort(): Promise<Sdk> {
  vi.resetModules();
  const mod = await import('../../src/three-d-secure/marlim/index');
  return { init: mod.init, authenticate: mod.authenticate };
}

export async function flushMicrotasks(times = 30): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await Promise.resolve();
  }
}

export function dispatchMessage(world: World, origin: string, data: unknown): void {
  const event = new MessageEvent('message', { data });
  Object.defineProperty(event, 'origin', { configurable: true, value: origin });
  world.window.dispatchEvent(event);
}

export function dispatchEscape(world: World): void {
  const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
  world.document.dispatchEvent(event);
}

export function recordOutcome(trace: Trace, settled: PromiseSettledResult<unknown>): void {
  if (settled.status === 'fulfilled') {
    trace.result = { status: 'resolved', value: settled.value };
    return;
  }
  const reason = settled.reason;
  if (typeof reason === 'string') {
    trace.result = { status: 'rejected', kind: 'string', message: reason };
    return;
  }
  if (reason instanceof Error) {
    trace.result = { status: 'rejected', kind: 'Error', message: reason.message };
    return;
  }
  trace.result = { status: 'rejected', kind: 'other', message: String(reason) };
}

export function comparableTrace(trace: Trace, options: { ignoreValidationMessage?: boolean } = {}): unknown {
  const result = { ...trace.result };
  if (options.ignoreValidationMessage && result.status === 'rejected') {
    result.message = '<validation>';
  }
  return {
    requests: trace.requests,
    submits: trace.submits,
    listeners: trace.listeners,
    consoles: trace.consoles,
    snapshots: trace.snapshots,
    result,
  };
}
