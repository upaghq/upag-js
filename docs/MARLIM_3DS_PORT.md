# Marlim 3DS SDK 1.1.0 port

First-party, zero-runtime-dependency port of
[Marlim 3DS SDK 1.1.0](https://cdn.marlim.co/3ds/1.1.0/marlim-3ds-sdk.min.js)
([docs](https://docs.api.marlim.co/3ds)).

This is a port, not a cleanup. Leaks, dead CSS, string-rejects, and console
text are kept on purpose.

## Target

| | |
| --- | --- |
| Version | 1.1.0 |
| Oracle | `tests/fixtures/marlim-3ds-sdk-1.1.0.min.js` |
| SHA-256 | `be3864dd47ef0edbdc3fdf5a6ad0320cbf3e0a30b0270f9783906d60765a8b94` |
| CDN | https://cdn.marlim.co/3ds/1.1.0/marlim-3ds-sdk.min.js |
| Size | 101157 bytes |

The CDN file is byte-identical to `marlim-sdk-3ds@1.1.0` `dist/marlim-3ds-sdk.min.js`.
The ESM build (`dist/marlim-3ds-sdk.min.mjs`) is a different wrapper around the
same application code.

`upag.min.js` was already bundling 1.1.0 (axios 1.12.2 + zod 4.1.12). The port
removes those libraries; it does not change the protocol.

## Function map

| Original (minified / package) | Port |
| --- | --- |
| `zs` / `init` | [`src/three-d-secure/marlim/index.ts`](../src/three-d-secure/marlim/index.ts) `init` + [`state.ts`](../src/three-d-secure/marlim/state.ts) |
| `ks` / `authenticate` | [`index.ts`](../src/three-d-secure/marlim/index.ts) `authenticate` |
| `ys` alias transform | [`aliases.ts`](../src/three-d-secure/marlim/aliases.ts) `applyAliases` |
| `gs` / `ws` / `_s` zod schemas | [`validate.ts`](../src/three-d-secure/marlim/validate.ts) |
| `Ot` axios client / `handleError` | [`http.ts`](../src/three-d-secure/marlim/http.ts) |
| `Ft` DDC | [`ddc.ts`](../src/three-d-secure/marlim/ddc.ts) `processSessionHandler` |
| `jt` challenge modal | [`challenge.ts`](../src/three-d-secure/marlim/challenge.ts) `processChallengeWithIframe` |
| challenge CSS literal | [`challenge-css.ts`](../src/three-d-secure/marlim/challenge-css.ts) |
| `It` / `Ct` / `Pt` origins | [`origins.ts`](../src/three-d-secure/marlim/origins.ts) |
| `Ut` / `java_enabled` | [`device.ts`](../src/three-d-secure/marlim/device.ts) |

The Upag loader ([`browser-authenticator.ts`](../src/utils/three-d-secure/browser-authenticator.ts))
and [`ThreeDSecure`](../src/resources/three-d-secure.ts) are unchanged except the
import specifier (`../../three-d-secure/marlim` instead of `marlim-sdk-3ds`).

## Quirks kept on purpose

- Module singleton: `init` overwrites config; `authenticate` uses the last one.
- DDC iframe (`session-iframe`) and form (`#session-form`) are never removed.
  Repeated calls create duplicate ids.
- Challenge `message` listener is never removed.
- Challenge `keydown` listener is never removed; `window.challengeModalKeyHandler`
  is overwritten each time.
- Escape closes the UI after 300 ms and leaves the authenticate promise pending
  (this is what `watchChallengeDismissal` relies on).
- Dead `.challenge-modal-close` CSS is injected; no close button is created.
- `java_enabled` is `!!window.WebGLRenderingContext`.
- `javascript_enabled` is true iff `window`, `document`, `Array`, and `Object` exist.
- Authenticate-stage failures reject with a **string**, not an `Error`.
- Setup-stage failures are always `new Error(message)`.
- Email is any string (including `""`); the oracle message is `"Invalid email"`
  but there is no format check.
- Production `challenge` must be `undefined`; `false` is an error.
- Sandbox `challenge` defaults to `false` and is sent in the body.
- Axios-observable HTTP: `Accept: application/json, text/plain, */*`,
  `Content-Type: application/json`, `Authorization` only if the token is truthy,
  10 s timeout, body parsed as JSON-if-possible, `"Request error."` fallback.

## Validation-message exception

The oracle throws `Error(zodError.message)` (JSON of issues). The port throws
readable messages that reuse the oracle's rule text
(`"CVV must be 3 or 4 digits"`, `"token is required"`, …).

This is allowed because [`ThreeDSecure.mapAuthenticationError`](../src/resources/three-d-secure.ts)
discards every non-`Interrupted` provider error:

```198:215:src/resources/three-d-secure.ts
  private mapAuthenticationError(error: unknown, sessionId: string): { outcome: Outcome; error: UpagError } {
    // ...
    // Errors from the authentication module are never forwarded as-is.
    return {
      outcome: 'failed',
      error: threeDSecureError('authentication_failed', 'The card could not be authenticated', { sessionId }),
    };
  }
```

Covered by `tests/three-d-secure.test.ts` ("never forwards the authentication
module error"). Differential tests ignore validation **text** only.

## Embedded SDK vs 1.1.0

`package.json` already pinned `marlim-sdk-3ds@1.1.0`, and the previous
`dist/v1/upag.min.js` already contained `card_id`, `message`/`error`/`errors`
extraction, and Cardinal/Marlim origin allowlists.

Known 1.1.0 deltas versus older Marlim builds (already present in the last
embedded bundle):

- `card_id` as a third card source (exactly one of `card` / `card_hash` / `card_id`)
- `handleError` walks `data.message`, then `data.error`, then `data.errors`
- Challenge `postMessage` accepts only the Marlim API origin for the env

The port does not change that protocol; it only removes axios and zod.

## Bundle size (`dist/v1/upag.min.js`)

| | Before (axios + zod) | After (port) |
| --- | ---: | ---: |
| raw | 112508 | 24142 |
| gzip -9 | 37311 | 8457 |
| brotli | 32411 | 7443 |

`check:bundle` fails if `dist/` still contains `axios`, `zod`, or `marlim-sdk-3ds`.

## Contract test (pending)

Playwright against the live Marlim sandbox is **not** in this change.

When picked up, it should:

- Be gated by an env var (sandbox API key + session token from `GET /v3/3ds/sessions`)
- Run frictionless and challenge cards in a real browser
- Be scheduled daily in CI
- Notify the team on failure

## Melhorias futuras

Do **not** implement these in the port. Listed only so they are not "fixed"
accidentally:

- Remove DDC iframe/form after completion
- Remove challenge `message` and `keydown` listeners
- Settle the promise on Escape (would break `watchChallengeDismissal`)
- Remove unused `.challenge-modal-close` CSS
- CSP-safe styling (`textContent` instead of `innerHTML`)
- Real `java_enabled` (Java plugin) instead of WebGL
- Reject authenticate-stage errors as `Error` instead of a string
- Validate email format
- Deduplicate `#session-form` / `#challenge-modal-overlay` ids

Axios uses `xhr.timeout` for the 10 s HTTP limit. Under jsdom + MSW that property
does not fire, so the differential suite covers timeout on the port only
(fake timers). Network errors are compared on both implementations.
