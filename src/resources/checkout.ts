import { BaseResource } from './base-resource';
import {
  CheckoutSession,
  CreateCheckoutSessionParams,
} from '../types';

export class Checkout extends BaseResource {
  constructor(http: any) {
    super(http, '/checkout/sessions');
  }

  /**
   * Create a new checkout session
   * @param params - Checkout session creation parameters
   * @returns The created checkout session
   */
  async createSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>(this.basePath, params);
  }

  /**
   * Retrieve a checkout session by ID
   * @param id - Checkout session ID
   * @returns The checkout session
   */
  async retrieveSession(id: string): Promise<CheckoutSession> {
    return this.http.get<CheckoutSession>(this.buildUrl(id));
  }

  /**
   * Redirect to checkout page
   * @param sessionId - Checkout session ID
   */
  redirectToCheckout(sessionId: string): void {
    const session = this.retrieveSession(sessionId);
    session.then((data) => {
      if (typeof window !== 'undefined') {
        window.location.href = data.url;
      }
    });
  }
}

