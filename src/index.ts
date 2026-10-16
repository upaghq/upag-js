// Main client
export { UpagJs } from './client';

// Types
export * from './types';

// Resources (for advanced usage)
export { Antifraud } from './resources/antifraud';
export { Cards } from './resources/cards';
export { Checkout } from './resources/checkout';
export { Files } from './resources/files';
export { Pix } from './resources/pix';
export { ThreeDSecure } from './resources/three-d-secure';

// Default export
import { UpagJs } from './client';
export default UpagJs;
