import { BaseResource } from './base-resource';
import {
  CheckoutSession,
  CreateCheckoutSessionParams,
} from '../types';

export class Checkout extends BaseResource {
  constructor(http: any) {
    super(http, '/checkout/sessions');
  }

  async createSession(params: CreateCheckoutSessionParams): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>(this.basePath, params);
  }
}
