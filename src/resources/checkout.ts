import { BaseResource } from './base-resource';
import {
  CheckoutSession,
  CreateCheckoutSessionParams,
} from '../types';

export class Checkout extends BaseResource {
  constructor(http: any) {
    super(http, '/billing/checkout-sessions');
  }

  async createSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>(this.basePath, params);
  }

  async redirectToCheckout(params: CreateCheckoutSessionParams): Promise<void> {
    const session = await this.createSession(params);

    if (typeof window === 'undefined') {
      throw new Error('redirectToCheckout is only available in browser environments');
    }

    window.location.href = session.url;
  }
}
