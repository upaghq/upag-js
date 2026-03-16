import { BaseResource } from './base-resource';
import { PaymentMethod, CreatePaymentMethodParams } from '../types';

export class PaymentMethods extends BaseResource {
  constructor(http: any) {
    super(http, '/customers');
  }

  async create(customerId: string, params: CreatePaymentMethodParams): Promise<PaymentMethod> {
    return this.http.post<PaymentMethod>(`${this.basePath}/${customerId}/payment-methods`, params);
  }
}

