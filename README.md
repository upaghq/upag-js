# Upag.js - Frontend SDK

Official JavaScript library for the Upag API - Payment and subscription management for frontend applications.

## Installation

```bash
npm install upag-js
```

## Usage

### Script tag (no bundler)

`dist/upag.js` is a single file that sets `window.UpagJs`. It needs no `type="module"`:

```html
<script src="https://js.upag.io/v1/upag.js"></script>
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

> **Important**: Always use your **public key** (`pk_test_xxx` or `pk_live_xxx`) in frontend code, never your secret key!

### Checkout Sessions

Create a checkout session with price items and redirect the customer to the hosted checkout page.

```javascript
const session = await upag.checkout.createSession({
  items: [
    { priceId: 'prc_123', quantity: 1 },
    { priceId: 'prc_456', quantity: 2 },
  ],
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  paymentMethods: ['credit_card', 'pix'],
  billingAddressCollection: 'required',
  customerId: 'cus_123', // optional
});

// Redirect to checkout
window.location.href = session.url;

// Or use the helper to create and redirect in one step
await upag.checkout.redirectToCheckout({
  items: [{ priceId: 'prc_123', quantity: 1 }],
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
});
```

### Customers

```javascript
const customer = await upag.customers.create({
  email: 'customer@example.com',
  name: 'John Doe',
  phone: '+5511999999999',
  taxId: '12345678900',
  line1: 'Rua Example, 123',
  city: 'São Paulo',
  state: 'SP',
  country: 'BR',
  zipCode: '01001000',
});
```

### Products & Prices

```javascript
// List all products
const { data: products } = await upag.products.list();

// Retrieve a specific product
const product = await upag.products.retrieve('prd_123');

// List prices for a product
const { data: prices } = await upag.products.listPrices('prd_123');

// Retrieve a specific price
const price = await upag.products.retrievePrice('prd_123', 'prc_456');
```

### Payment Methods

```javascript
// Create a payment method for a customer
const paymentMethod = await upag.paymentMethods.create('cus_123', {
  type: 'credit_card',
  card: {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2027,
    cvc: '123',
    holderName: 'John Doe',
  },
});
```

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

### Antifraud

The antifraud module automatically collects device and browser fingerprinting data (canvas, WebGL, audio hashes, bot detection, etc.) and creates a session.

```javascript
// Auto-collect all browser data and create session
const session = await upag.antifraud.createSession();

console.log(session.id);        // antifraud session ID
console.log(session.expiresAt); // session expiry
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
  -d '{ "type": "card", "amount": 10000, "installments": 3, "card": "<card id>", "customer": "<customer id>", "threeDSecureSessionId": "<sessionId>" }'
```

The session authenticates one card for one amount and installment count, and can be used by one charge only. Keep the `clientSecret` out of logs and URLs: it authorizes this browser to work on the session.

3D Secure talks to the core API, not to the billing API. The environment follows your key (`pk_test_…` is sandbox, `pk_live_…` is production); override it with the `environment` option (`'production'` or `'sandbox'`), or point at any URL with `coreBaseURL`. `coreBaseURL` wins over `environment`, which wins over the key.

```javascript
const upag = new UpagJs({ publicKey: 'pk_test_xxx', environment: 'sandbox' });
```

Only one authentication can run at a time. `authenticate` must be called in the browser (not during SSR).

## Framework Examples

### React

```jsx
import { useState, useEffect } from 'react';
import { UpagJs } from 'upag-js';

const upag = new UpagJs('pk_test_your_public_key');

function CheckoutButton({ priceId }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const session = await upag.checkout.createSession({
        items: [{ priceId, quantity: 1 }],
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/cancel`,
      });

      window.location.href = session.url;
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

const props = defineProps({ priceId: String });

const upag = new UpagJs('pk_test_your_public_key');
const loading = ref(false);

async function handleCheckout() {
  loading.value = true;
  try {
    const session = await upag.checkout.createSession({
      items: [{ priceId: props.priceId, quantity: 1 }],
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/cancel`,
    });

    window.location.href = session.url;
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
      const session = await upag.checkout.createSession({
        items: [{ priceId: 'prc_123', quantity: 1 }],
        successUrl: window.location.origin + '/success',
        cancelUrl: window.location.origin + '/cancel',
      });

      window.location.href = session.url;
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
  CheckoutSession,
  CreateCheckoutSessionParams,
  Customer,
  CreateCustomerParams,
  Product,
  Price,
  PaymentMethod,
  AntifraudSession,
} from 'upag-js';
```

## Error Handling

All API errors are thrown with detailed information:

```javascript
try {
  const session = await upag.checkout.createSession({
    items: [{ priceId: 'prc_123', quantity: 1 }],
    successUrl: 'https://yoursite.com/success',
    cancelUrl: 'https://yoursite.com/cancel',
  });
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
| `checkout` | `createSession(params)` | Create a checkout session |
| `checkout` | `redirectToCheckout(params)` | Create session and redirect to checkout URL |
| `customers` | `create(params)` | Create a customer |
| `products` | `list()` | List all products |
| `products` | `retrieve(productId)` | Retrieve a product |
| `products` | `listPrices(productId)` | List prices for a product |
| `products` | `retrievePrice(productId, priceId)` | Retrieve a specific price |
| `paymentMethods` | `create(customerId, params)` | Create a payment method |
| `cards` | `create(params, options?)` | Tokenize a card |
| `antifraud` | `createSession()` | Create antifraud session (auto-collects browser data) |
| `threeDSecure` | `authenticate({ clientSecret }, options?)` | Run 3D Secure authentication for a session created by your server |

## Security Best Practices

**DO:**
- Use public keys (`pk_test_xxx` or `pk_live_xxx`) in frontend
- Use card tokenization for secure card handling
- Use antifraud sessions to detect suspicious activity
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
