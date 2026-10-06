# Test fixtures

## `marlim-3ds-sdk-1.1.0.min.js`

Official Marlim 3DS SDK 1.1.0, downloaded from
https://cdn.marlim.co/3ds/1.1.0/marlim-3ds-sdk.min.js

- SHA-256: `be3864dd47ef0edbdc3fdf5a6ad0320cbf3e0a30b0270f9783906d60765a8b94`
- Size: 101157 bytes
- Exposes `var MarlimSDK_3DS = { init, authenticate, default: { init, authenticate }, __esModule }`
- Byte-identical to `marlim-sdk-3ds@1.1.0` `dist/marlim-3ds-sdk.min.js` (CJS/CDN build)

The ESM build of that package (`dist/marlim-3ds-sdk.min.mjs`) is a different wrapper
around the same application code (hash `3261dff1f345c4a606a2103c48c40740cd43f685df3063c1cef324485a43012c`).

This file is the oracle for differential parity tests. Do not edit it.
