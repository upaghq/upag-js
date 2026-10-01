// Main client
export { UpagJs } from './client';

// Types
export * from './types';

// Resources (for advanced usage)
export { Antifraud } from './resources/antifraud';
export { Cards } from './resources/cards';
export { Checkout } from './resources/checkout';
export { Customers } from './resources/customers';
export { PaymentMethods } from './resources/payment-methods';
export { Products } from './resources/products';
export { ThreeDSecure } from './resources/three-d-secure';

// Default export
import { UpagJs } from './client';
export default UpagJs;
