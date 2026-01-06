import { BaseResource } from './base-resource';
import {
  Payment,
  CreatePaymentParams,
  ConfirmPaymentParams,
} from '../types';

export class Payments extends BaseResource {
  constructor(http: any) {
    super(http, '/payments');
  }

  /**
   * Create a new payment
   * @param params - Payment creation parameters
   * @returns The created payment
   */
  async create(params: CreatePaymentParams): Promise<Payment> {
    return this.http.post<Payment>(this.basePath, params);
  }

  /**
   * Retrieve a payment by ID
   * @param id - Payment ID
   * @returns The payment
   */
  async retrieve(id: string): Promise<Payment> {
    return this.http.get<Payment>(this.buildUrl(id));
  }

  /**
   * Confirm a payment with additional payment method details
   * @param id - Payment ID
   * @param params - Confirmation parameters
   * @returns The confirmed payment
   */
  async confirm(id: string, params: ConfirmPaymentParams): Promise<Payment> {
    return this.http.post<Payment>(this.buildUrl(`${id}/confirm`), params);
  }
}

