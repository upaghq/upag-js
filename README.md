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

// Or with full configuration
const upag = new UpagJs({
  publicKey: 'pk_test_your_public_key',
  baseURL: 'https://api.upag.io/v1', // optional
  timeout: 30000 // optional, default 30s
});
```

⚠️ **Important**: Always use your **public key** (`pk_test_xxx` or `pk_live_xxx`) in frontend code, never your secret key!

### Checkout

```javascript
// Create a checkout session
const session = await upag.checkout.createSession({
  customerEmail: 'customer@example.com',
  amount: 10000, // R$ 100.00 in cents
  currency: 'BRL',
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  description: 'Premium Plan Subscription',
  paymentMethods: ['credit_card', 'pix']
});

// Redirect to checkout
window.location.href = session.url;

// Or use the helper method
upag.checkout.redirectToCheckout(session.id);

// Retrieve a checkout session
const session = await upag.checkout.retrieveSession('cs_123');
```

### Payment Methods (Secure Card Handling)

**Recommended approach using tokenization:**

```javascript
// Step 1: Tokenize the card (secure)
const token = await upag.paymentMethods.tokenizeCard({
  number: '4242424242424242',
  expMonth: 12,
  expYear: 2025,
  cvc: '123',
  holderName: 'John Doe'
});

// Step 2: Create payment method with token
const paymentMethod = await upag.paymentMethods.createFromToken(
  'cus_123', // customerId
  token.id
);

console.log('Payment method created:', paymentMethod);
console.log('Card brand:', paymentMethod.card.brand);
console.log('Last 4 digits:', paymentMethod.card.last4);
```

**Alternative approach (less secure):**

```javascript
// Create payment method directly
const paymentMethod = await upag.paymentMethods.create({
  customerId: 'cus_123',
  type: 'credit_card',
  card: {
    number: '4242424242424242',
    expMonth: 12,
    expYear: 2025,
    cvc: '123',
    holderName: 'John Doe'
  }
});
```

**List and manage payment methods:**

```javascript
// List payment methods for a customer
const methods = await upag.paymentMethods.listByCustomer('cus_123');

// Retrieve a specific payment method
const method = await upag.paymentMethods.retrieve('pm_123');

// Delete a payment method
const deleted = await upag.paymentMethods.delete('pm_123');
```

### Payments

```javascript
// Create a payment
const payment = await upag.payments.create({
  customerId: 'cus_123',
  amount: 10000, // R$ 100.00 in cents
  currency: 'BRL',
  paymentMethod: 'credit_card',
  paymentMethodId: 'pm_123',
  description: 'Order #123'
});

// Or use a card token
const payment = await upag.payments.create({
  customerId: 'cus_123',
  amount: 10000,
  currency: 'BRL',
  paymentMethod: 'credit_card',
  cardToken: 'tok_123',
  description: 'Order #123'
});

// Retrieve a payment
const payment = await upag.payments.retrieve('pay_123');

// Confirm a payment (for 3D Secure, etc)
const confirmed = await upag.payments.confirm('pay_123', {
  paymentMethodId: 'pm_123'
});
```

## Framework Examples

### React Example

```jsx
import { useState } from 'react';
import { UpagJs } from 'upag-js';

const upag = new UpagJs('pk_test_your_public_key');

function CheckoutButton() {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const session = await upag.checkout.createSession({
        customerEmail: 'customer@example.com',
        amount: 10000,
        currency: 'BRL',
        successUrl: `${window.location.origin}/success`,
        cancelUrl: `${window.location.origin}/cancel`,
      });
      
      window.location.href = session.url;
    } catch (error) {
      console.error('Checkout error:', error);
      alert(error.message);
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

### Vue Example

```vue
<template>
  <button @click="handleCheckout" :disabled="loading">
    {{ loading ? 'Processing...' : 'Checkout' }}
  </button>
</template>

<script setup>
import { ref } from 'vue';
import { UpagJs } from 'upag-js';

const upag = new UpagJs('pk_test_your_public_key');
const loading = ref(false);

async function handleCheckout() {
  loading.value = true;
  try {
    const session = await upag.checkout.createSession({
      customerEmail: 'customer@example.com',
      amount: 10000,
      currency: 'BRL',
      successUrl: `${window.location.origin}/success`,
      cancelUrl: `${window.location.origin}/cancel`,
    });
    
    window.location.href = session.url;
  } catch (error) {
    console.error('Checkout error:', error);
    alert(error.message);
  } finally {
    loading.value = false;
  }
}
</script>
```

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <title>Upag Checkout</title>
</head>
<body>
  <button id="checkout-btn">Checkout</button>

  <script type="module">
    import { UpagJs } from 'https://cdn.jsdelivr.net/npm/upag-js@1.0.0/dist/index.esm.js';

    const upag = new UpagJs('pk_test_your_public_key');
    
    document.getElementById('checkout-btn').addEventListener('click', async () => {
      try {
        const session = await upag.checkout.createSession({
          customerEmail: 'customer@example.com',
          amount: 10000,
          currency: 'BRL',
          successUrl: window.location.origin + '/success',
          cancelUrl: window.location.origin + '/cancel',
        });
        
        window.location.href = session.url;
      } catch (error) {
        console.error('Error:', error);
      }
    });
  </script>
</body>
</html>
```

## TypeScript Support

This library is written in TypeScript and includes type definitions out of the box.

```typescript
import { 
  UpagJs,
  CheckoutSession,
  PaymentMethod,
  Payment,
  CardToken,
  CreateCheckoutSessionParams,
  TokenizeCardParams
} from 'upag-js';
```

## Error Handling

All API errors are thrown with detailed information:

```javascript
try {
  const payment = await upag.payments.create({
    customerId: 'cus_123',
    amount: 10000,
    paymentMethod: 'credit_card'
  });
} catch (error) {
  console.error('Error type:', error.type);
  console.error('Error message:', error.message);
  console.error('Status code:', error.statusCode);
  console.error('Error code:', error.code);
  console.error('Details:', error.details);
}
```

### Error Types

- `api_error` - Server-side error
- `validation_error` - Invalid parameters
- `authentication_error` - Invalid public key
- `network_error` - Network/connection error
- `client_error` - Client-side error

## Security Best Practices

### ✅ DO:
- Use public keys (`pk_test_xxx` or `pk_live_xxx`) in frontend
- Use card tokenization for secure card handling
- Validate input on your backend
- Use HTTPS in production

### ❌ DON'T:
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

## Bundle Size

- Minified: ~15KB
- Gzipped: ~5KB

## Development

```bash
# Install dependencies
npm install

# Build the package
npm run build

# Watch mode for development
npm run dev

# Run tests
npm test
```

## License

MIT

## Support

- Documentation: https://docs.upag.io
- Email: support@upag.io
- GitHub: https://github.com/upag/upag-js

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

