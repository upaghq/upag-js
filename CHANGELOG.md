# Changelog

All notable changes to `upag-js` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Script-tag build, `dist/upag.js`: a single self-contained file that sets `window.UpagJs`, so it works with a plain `<script src>` and no bundler or `type="module"`.
- `cards.create(params, { idempotencyKey? })`: tokenizes a card with a public key (`POST /v1/cards`).
- `threeDSecure.authenticate({ clientSecret })`: 3D Secure authentication for saved cards, with device data collection and bank challenge handled in the browser. Your server creates the session with its secret key; the browser starts and completes it with the session's `clientSecret`, and the charge is created with `threeDSecureSession`. `threeDSecure` has not been published yet, so this is its first release. The bundled browser module is a first-party port of Marlim 3DS 1.1.0 (saved-card `card_id` in `authenticate`), with no axios or zod.
- The API host follows the key (`pk_test_` → sandbox, anything else → production). `baseURL` still overrides it for local development.
- Shopper checkout: `checkout.start`, `retrieve`, `confirm`, `applyCoupon`, `removeCoupon`, `redirectToCheckout`.
- `antifraud`: device session on the client (`sessionId`, `rotate`). Starts with `new UpagJs(...)`. A `pk_test_` key uses the sandbox org; any other key uses production. Send `sessionId()` as `meta.session_id` on a card charge.
- The HTTP client reads both error formats: fields at the top of the body (billing) and nested under `error` (core). It can omit `Authorization` or send a session `clientSecret`.
- `check:bundle` script, run before publishing, to ensure the 3D Secure browser module is bundled into `dist` and not required at runtime.

### Changed
- The 3D Secure browser module is no longer `marlim-sdk-3ds` (axios + zod). It is an internal TypeScript port of the official 1.1.0 SDK (`src/three-d-secure/marlim`). `dist/v1/upag.min.js` dropped from 110 KB to 24 KB raw (37 KB → 8 KB gzip).
- **Breaking**: `environment` is gone. The API host and the antifraud org follow the key (`pk_test_` → sandbox / test, `pk_live_` → production / live). `baseURL` still overrides the host.
- **Breaking**: the HTTP client uses the native `fetch` instead of `axios`, so `upag-js` has no runtime dependencies. It requires an environment with `fetch` (all current browsers, Node 18+); `engines.node` is now `>=18`. Errors keep the same shape; a request that exceeds `timeout` is reported as a `network_error`.
- **Breaking (unreleased `threeDSecure`)**: `authenticate` takes `{ clientSecret }` instead of `{ checkoutSessionId, paymentMethodId, installments }`, and no longer creates the session. The progress status `'creating_session'` is now `'starting'`, and `ThreeDSecureSession` no longer carries `checkoutSessionId` or `paymentMethodId`.
- **Breaking**: old billing methods are gone (`checkout.createSession`, `customers`, `products`, `paymentMethods`, `antifraud`, and the unreleased `upag.billing.*` catalog). A public key cannot create sessions or list products. Shopper checkout is `upag.checkout.start` (`POST /checkout/payment-links/:code/sessions`, no auth), then `retrieve` / `confirm` / `applyCoupon` / `removeCoupon` with the session `clientSecret`. Confirm takes inline `customer` + `payment: { method: 'pix' | 'card' }`. Amounts are integer cents; line `price` is the expanded price, not `priceId`.
- **Breaking**: entity refs on the wire drop the `Id` suffix. `Card.customer` replaces `customerId`. Card confirm sends `threeDSecureSession`, not `threeDSecureSessionId`.

### Fixed
- The HTTP client no longer sets a `User-Agent` header, which browsers refuse to let scripts set and reported as an error on every request.
- `exports` in `package.json` now lists `types` first, so TypeScript resolves the type definitions under `moduleResolution: bundler`/`node16`.

## [1.0.0] - 2025-01-XX

### Added
- Initial release of upag-js SDK
- Checkout sessions for secure payment flow
- Payment Methods resource with secure card tokenization
- Payments resource with confirmation support
- Browser-safe implementation (uses public keys only)
- Full TypeScript support with type definitions
- Support for CommonJS and ES Modules
- Error handling with detailed error types
- HTTP client with axios
- Comprehensive documentation with React, Vue, and Vanilla JS examples

### Features
- **Checkout**: createSession, retrieveSession, redirectToCheckout
- **Payment Methods**: tokenizeCard, createFromToken, create, retrieve, delete, listByCustomer
- **Payments**: create, retrieve, confirm

### Security
- Public key validation (warns if secret key is used)
- Card tokenization for secure card data handling
- Browser-safe API design

[Unreleased]: https://github.com/upag/upag-js/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/upag/upag-js/releases/tag/v1.0.0

