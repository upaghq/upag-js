import { UpagJsConfig } from './types';
import { HttpClient } from './utils/http-client';
import { Antifraud } from './resources/antifraud';
import { Cards } from './resources/cards';
import { Checkout } from './resources/checkout';
import { ThreeDSecure } from './resources/three-d-secure';

export class UpagJs {
  private http: HttpClient;

  public readonly antifraud: Antifraud;
  public readonly cards: Cards;
  public readonly checkout: Checkout;
  public readonly threeDSecure: ThreeDSecure;

  /**
   * Create a new Upag JS client instance
   * @param publicKey - Your Upag public key (`pk_test_xxx` or `pk_live_xxx`)
   * @param config - Or a config object with `publicKey`, `baseURL` and `timeout`
   */
  constructor(publicKey: string);
  constructor(config: UpagJsConfig);
  constructor(publicKeyOrConfig: string | UpagJsConfig) {
    const config: UpagJsConfig = typeof publicKeyOrConfig === 'string'
      ? { publicKey: publicKeyOrConfig }
      : publicKeyOrConfig;

    if (!config || !config.publicKey) {
      throw new Error('Public key is required');
    }

    if (!config.publicKey.startsWith('pk_')) {
      console.warn('⚠️  Warning: You should use a public key (pk_test_xxx or pk_live_xxx) in the frontend, not a secret key!');
    }

    this.http = new HttpClient(config);

    this.antifraud = new Antifraud(this.http);
    this.cards = new Cards(this.http);
    this.checkout = new Checkout(this.http);
    this.threeDSecure = new ThreeDSecure(this.http);
  }
}
