# Upag.js - Frontend SDK

Official JavaScript library for the Upag API - Payment and subscription management for frontend applications.

## Installation

```bash
npm install upag-js
```

## Usage

### Script tag (no bundler)

`dist/v1/upag.min.js` is a single file that sets `window.UpagJs`. It needs no `type="module"`:

```html
<script src="https://js.upag.io/v1/upag.min.js"></script>
<script>
  const upag = new UpagJs('pk_test_xxx');
</script>
```

### Initialize the client

```javascript
import { UpagJs } from 'upag-js';

// Using public key only
const upag = new UpagJs('pk_test_your_public_key');
```

The environment follows the key: `pk_test_` is `sandbox`, anything else is `production`. It decides the API host and the antifraud org, and is readable as `upag.environment`. `baseURL` overrides the host only (for local development).

```javascript
upag.environment; // 'sandbox' | 'production'
```

> **Important**: Always use your **public key** (`pk_test_xxx` or `pk_live_xxx`) in frontend code, never your secret key!

### Checkout

A public key cannot create sessions or list the catalog. The shopper page starts from a payment-link code (no auth), then reads and pays the session with the `clientSecret` returned once by `start`. Tokenize cards with `pk_`.

```javascript
const session = await upag.checkout.start('link-code', {
  utmSource: 'ads',
});
const { id, clientSecret } = session;

const fresh = await upag.checkout.retrieve(id, clientSecret);

const paid = await upag.checkout.confirm(id, clientSecret, {
  customer: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    document: { type: 'cpf', number: '52998224725' },
  },
  charge: { method: 'pix' },
});

// Boleto: needs a full address and phone on the customer. On a subscription a new boleto is issued each cycle.
// The confirmed charge stays pending and carries charge.boleto.digitableLine / pdfUrl.
// charge: { method: 'boleto' }

// Card: tokenize first, then confirm with the card id
const card = await upag.cards.create({
  number: '4242424242424242',
  expirationMonth: 12,
  expirationYear: 2030,
  cvv: '123',
  holderName: 'Jane Doe',
});

await upag.checkout.confirm(id, clientSecret, {
  customer: {
    name: 'Jane Doe',
    document: { type: 'cpf', number: '52998224725' },
  },
  charge: { method: 'card', card: card.id, installments: 1 },
});

// Free trial: when `session.trial` is set and `session.amount` is 0, nothing is
// charged today. Keep a card for the first charge instead of sending `charge`
// (optional when `session.paymentMethodCollection` is 'if_required').
if (session.trial && session.amount === 0) {
  await upag.checkout.confirm(id, clientSecret, {
    customer: {
      name: 'Jane Doe',
      document: { type: 'cpf', number: '52998224725' },
    },
    paymentMethod: { type: 'card', card: card.id },
  });
}

await upag.checkout.applyCoupon(id, clientSecret, { code: 'SAVE10' });
await upag.checkout.removeCoupon(id, clientSecret);
await upag.checkout.listApps(id, clientSecret);

// Shopify cart → hosted checkout URL
const shopify = await upag.checkout.startShopify({
  items: [{ variantId: 'gid://shopify/ProductVariant/1', quantity: 1 }],
});

// Or send the browser to the hosted page
await upag.checkout.redirectToCheckout('link-code');
```

Creating sessions, products and prices is done from your server with a secret key.

### Cards

Tokenizes a card and returns a card id. Your server uses that id to create a charge. The card number and security code are never returned.

```javascript
const card = await upag.cards.create({
  number: '4242424242424242',
  expirationMonth: 12,
  expirationYear: 2030,
  cvv: '123',
  holderName: 'John Doe', // letters and spaces only
});

console.log(card.id);         // send this to your server
console.log(card.brand);      // 'visa'
console.log(card.lastDigits); // '4242'

// Optional: make retries safe
await upag.cards.create(params, { idempotencyKey: 'checkout_42' });
```

`create` is the only card operation a public key can perform. Listing, retrieving and removing cards need your secret key, so do those from your server.

### Files

Uploads a file, such as a logo or a product image, and returns it with a public `url`.

```javascript
const input = document.querySelector('input[type="file"]');

const file = await upag.files.create({
  file: input.files[0], // a File or a Blob
  purpose: 'business_logo',
  name: 'Store logo', // optional, defaults to the file name
});

console.log(file.id);
console.log(file.url); // CDN address of the file
```

A public key can upload only the public purposes: `business_icon`, `business_logo`, `product_image`, `user_profile_picture` and `checkout_asset`. Any other purpose (`dispute_evidence`, `identity_document`, `content_delivery`, `social_contract`, `other`) is private, has `url: null` and needs your secret key, so upload those from your server.

Accepted formats are JPEG, PNG, WEBP, PDF and CSV, up to 10 MB. The API checks the content of the file, not the type you declare. Images are resized to fit 1080x720 and recompressed. Uploads from a public key are rate limited, and past the limit the call fails with code `too_many_uploads`.

### Antifraud

Constructing the client in a browser starts the device profiler. A `pk_test_` key uses the sandbox org; any other key uses production. Send `sessionId()` as `meta.session_id` on the card charge. Call `rotate()` before a retry.

```javascript
const deviceSessionId = upag.antifraud.sessionId();
upag.antifraud.rotate();
```

### 3D Secure

Authenticates a saved card with the buyer's bank before you charge it. Your server opens the session with its secret key; the browser only finishes it, using the session's `clientSecret`. The SDK handles device data collection and, when the bank requires it, the challenge window.

**1. Backend** — create the session with your secret key and hand the `clientSecret` to the page:

```bash
curl -X POST https://api.upag.io/v1/3ds/sessions \
  -H "Authorization: Bearer $UPAG_SECRET_KEY" \
  -H "Idempotency-Key: order-10482" \
  -H "Content-Type: application/json" \
  -d '{ "amount": 10000, "installments": 3, "card": "<card id>", "customer": "<customer id>" }'
```

**2. Browser** — authenticate with the `clientSecret`:

```javascript
try {
  const { sessionId } = await upag.threeDSecure.authenticate(
    { clientSecret },
    {
      onStatusChange: (status) => console.log(status), // starting | authenticating | completing | idle
    }
  );

  // Send sessionId to your backend.
} catch (error) {
  if (error.code === 'authentication_canceled') {
    // The buyer closed the bank window
  }
}
```

**3. Backend** — create the card charge with the completed session:

```bash
curl -X POST https://api.upag.io/v1/charges \
  -H "Authorization: Bearer $UPAG_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "type": "card", "amount": 10000, "installments": 3, "card": "<card id>", "customer": "<customer id>", "threeDSecureSession": "<sessionId>" }'
```

The session authenticates one card for one amount and installment count, and can be used by one charge only. Keep the `clientSecret` out of logs and URLs: it authorizes this browser to work on the session.

3D Secure talks to the same host as cards and checkout. The host follows your key (`pk_test_…` is sandbox, `pk_live_…` is production). Override it with `baseURL`.

Only one authentication can run at a time. `authenticate` must be called in the browser (not during SSR).

## Framework Examples

### React

```jsx
import { useState, useEffect } from 'react';
import { UpagJs } from 'upag-js';

const upag = new UpagJs('pk_test_your_public_key');

function CheckoutButton({ code }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      await upag.checkout.redirectToCheckout(code);
    } catch (error) {
      console.error('Checkout error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleCheckout} disabled={loading}>
      {loading ? 'Processing...' : 'Checkout'}
    </button>
  );
}
```

### Vue

```vue
<template>
  <button @click="handleCheckout" :disabled="loading">
    {{ loading ? 'Processing...' : 'Checkout' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
import { UpagJs } from 'upag-js';

const props = defineProps({ code: String });

const upag = new UpagJs('pk_test_your_public_key');
const loading = ref(false);

async function handleCheckout() {
  loading.value = true;
  try {
    await upag.checkout.redirectToCheckout(props.code);
  } catch (error) {
    console.error('Checkout error:', error);
  } finally {
    loading.value = false;
  }
}
</script>
```

### Vanilla JavaScript

```html
<button id="checkout-btn">Checkout</button>

<script type="module">
  import { UpagJs } from 'https://cdn.jsdelivr.net/npm/upag-js/dist/index.esm.js';

  const upag = new UpagJs('pk_test_your_public_key');

  document.getElementById('checkout-btn').addEventListener('click', async () => {
    try {
      await upag.checkout.redirectToCheckout('link-code');
    } catch (error) {
      console.error('Error:', error);
    }
  });
</script>
```

## TypeScript

This library is written in TypeScript and includes type definitions out of the box.

```typescript
import {
  UpagJs,
  CheckoutPayload,
  CheckoutStartPayload,
  ConfirmCheckoutSessionParams,
  Card,
  CreateCardParams,
} from 'upag-js';
```

## Error Handling

All API errors are thrown with detailed information:

```javascript
try {
  await upag.checkout.start('link-code');
} catch (error) {
  console.error('Type:', error.type);
  console.error('Message:', error.message);
  console.error('Status:', error.statusCode);
  console.error('Code:', error.code);
  console.error('Details:', error.details);
}
```

### Error Types

- `api_error` - Server-side error
- `validation_error` - Invalid parameters
- `authentication_error` - Invalid public key
- `network_error` - Network/connection error
- `client_error` - Client-side error
- `three_d_secure_error` - 3D Secure authentication did not complete. Check `code`: `authentication_failed`, `authentication_canceled`, `authentication_timeout`, `authentication_unavailable`, `invalid_response`
- `client_error` with `invalid_params` - the `clientSecret` passed to `threeDSecure.authenticate` is missing

Errors returned by the API carry its `code` (for example `session_expired`, `unauthorized` or `too_many_attempts` on 3D Secure), whichever error format the endpoint uses.

## API Reference

| Resource | Method | Description |
|----------|--------|-------------|
| `checkout` | `start(code, tracking?)` | Open a session from a payment-link code (no auth; returns `clientSecret` once) |
| `checkout` | `retrieve(sessionId, clientSecret)` | Load the checkout payload |
| `checkout` | `confirm(sessionId, clientSecret, body)` | Pay with pix or a tokenized card |
| `checkout` | `applyCoupon(sessionId, clientSecret, { code })` | Apply a coupon |
| `checkout` | `removeCoupon(sessionId, clientSecret)` | Remove the coupon |
| `checkout` | `redirectToCheckout(code, tracking?)` | Start and send the browser to the hosted page |
| `cards` | `create(params, options?)` | Tokenize a card |
| `threeDSecure` | `authenticate({ clientSecret }, options?)` | Run 3D Secure authentication for a session created by your server |

## Security Best Practices

**DO:**
- Use public keys (`pk_test_xxx` or `pk_live_xxx`) in frontend
- Use card tokenization for secure card handling
- Validate input on your backend
- Use HTTPS in production

**DON'T:**
- Never use secret keys (`sk_test_xxx` or `sk_live_xxx`) in frontend
- Never store card data in your frontend
- Never trust frontend-only validation

## Public Keys

Get your public keys from the [Upag Dashboard](https://dashboard.upag.io).

- **Test mode**: `pk_test_...` - Use for testing
- **Live mode**: `pk_live_...` - Use in production

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## Development

```bash
npm install
npm run build
npm run dev
npm test
```

## License

MIT

## Support

- Documentation: https://docs.upag.io
- Email: support@upag.io
- GitHub: https://github.com/upag/upag-js
