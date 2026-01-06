import { UpagJsConfig } from './types';
import { HttpClient } from './utils/http-client';
import { Checkout } from './resources/checkout';
import { PaymentMethods } from './resources/payment-methods';
import { Payments } from './resources/payments';

export class UpagJs {
  private http: HttpClient;
  
  public readonly checkout: Checkout;
  public readonly paymentMethods: PaymentMethods;
  public readonly payments: Payments;

  /**
   * Create a new Upag JS client instance
   * @param publicKey - Your Upag public key (pk_test_xxx or pk_live_xxx)
   * @param config - Optional configuration
   */
  constructor(publicKey: string);
  constructor(config: UpagJsConfig);
  constructor(publicKeyOrConfig: string | UpagJsConfig) {
    const config: UpagJsConfig = typeof publicKeyOrConfig === 'string'
      ? { publicKey: publicKeyOrConfig }
      : publicKeyOrConfig;

    if (!config.publicKey) {
      throw new Error('Public key is required');
    }

    // Validate that it's a public key (not secret key)
    if (!config.publicKey.startsWith('pk_')) {
      console.warn('⚠️  Warning: You should use a public key (pk_test_xxx or pk_live_xxx) in the frontend, not a secret key!');
    }

    this.http = new HttpClient(config);
    
    // Initialize resources
    this.checkout = new Checkout(this.http);
    this.paymentMethods = new PaymentMethods(this.http);
    this.payments = new Payments(this.http);
  }
}

