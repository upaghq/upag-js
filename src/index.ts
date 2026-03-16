// Main client
export { UpagJs } from './client';

// Types
export * from './types';

// Resources (for advanced usage)
export { Antifraud } from './resources/antifraud';
export { Checkout } from './resources/checkout';
export { Customers } from './resources/customers';
export { PaymentMethods } from './resources/payment-methods';
export { Products } from './resources/products';

// Default export
import { UpagJs } from './client';
export default UpagJs;
