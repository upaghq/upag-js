# Upag.js - Frontend SDK

Official JavaScript library for the Upag API - Payment and subscription management for frontend applications.

## Installation

```bash
npm install upag-js
```

## Usage

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

### Antifraud

The antifraud module automatically collects device and browser fingerprinting data (canvas, WebGL, audio hashes, bot detection, etc.) and creates a session.

```javascript
// Auto-collect all browser data and create session
const session = await upag.antifraud.createSession();

console.log(session.id);        // antifraud session ID
console.log(session.expiresAt); // session expiry
```

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
| `antifraud` | `createSession()` | Create antifraud session (auto-collects browser data) |

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
