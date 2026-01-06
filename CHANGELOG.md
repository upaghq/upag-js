# Changelog

All notable changes to `upag-js` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

