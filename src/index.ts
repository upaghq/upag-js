// Main client
export { UpagJs } from './client';

// Types
export * from './types';

// Resources (for advanced usage)
export { Checkout } from './resources/checkout';
export { PaymentMethods } from './resources/payment-methods';
export { Payments } from './resources/payments';

// Default export
import { UpagJs } from './client';
export default UpagJs;

