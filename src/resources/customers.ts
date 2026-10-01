import { BaseResource } from './base-resource';
import {
  Customer,
  CreateCustomerParams,
} from '../types';

export class Customers extends BaseResource {
  constructor(http: any) {
    super(http, '/billing/customers');
  }

  async create(params: CreateCustomerParams): Promise<Customer> {
    return this.http.post<Customer>(this.basePath, params);
  }
}
