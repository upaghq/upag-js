import { BaseResource } from './base-resource';
import {
  PaymentMethod,
  CreatePaymentMethodParams,
  TokenizeCardParams,
  CardToken,
  ListResponse,
} from '../types';

export class PaymentMethods extends BaseResource {
  constructor(http: any) {
    super(http, '/payment-methods');
  }

  /**
   * Tokenize a credit card (secure way to handle card data)
   * @param params - Card tokenization parameters
   * @returns A secure card token
   */
  async tokenizeCard(params: TokenizeCardParams): Promise<CardToken> {
    return this.http.post<CardToken>('/tokens', params);
  }

  /**
   * Create a payment method using a card token
   * @param customerId - Customer ID
   * @param cardToken - Card token from tokenizeCard()
   * @returns The created payment method
   */
  async createFromToken(customerId: string, cardToken: string): Promise<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.basePath, {
      customerId,
      cardToken,
    });
  }

  /**
   * Create a payment method directly (less secure, use tokenizeCard instead)
   * @param params - Payment method creation parameters
   * @returns The created payment method
   */
  async create(params: CreatePaymentMethodParams): Promise<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.basePath, params);
  }

  /**
   * Retrieve a payment method by ID
   * @param id - Payment method ID
   * @returns The payment method
   */
  async retrieve(id: string): Promise<PaymentMethod> {
    return this.http.get<PaymentMethod>(this.buildUrl(id));
  }

  /**
   * Delete a payment method
   * @param id - Payment method ID
   * @returns The deleted payment method
   */
  async delete(id: string): Promise<PaymentMethod> {
    return this.http.delete<PaymentMethod>(this.buildUrl(id));
  }

  /**
   * List payment methods for a customer
   * @param customerId - Customer ID
   * @returns List of payment methods
   */
  async listByCustomer(customerId: string): Promise<ListResponse<PaymentMethod>> {
    const query = this.buildQueryString({ customerId });
    return this.http.get<ListResponse<PaymentMethod>>(`${this.basePath}${query}`);
  }
}

