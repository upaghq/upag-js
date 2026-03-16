import { BaseResource } from './base-resource';
import {
  Product,
  Price,
  ListResponse,
} from '../types';

export class Products extends BaseResource {
  constructor(http: any) {
    super(http, '/products');
  }

  async list(): Promise<ListResponse<Product>> {
    return this.http.get<ListResponse<Product>>(this.basePath);
  }

  async retrieve(productId: string): Promise<Product> {
    return this.http.get<Product>(this.buildUrl(productId));
  }

  async listPrices(productId: string): Promise<ListResponse<Price>> {
    return this.http.get<ListResponse<Price>>(this.buildUrl(`${productId}/prices`));
  }

  async retrievePrice(productId: string, priceId: string): Promise<Price> {
    return this.http.get<Price>(this.buildUrl(`${productId}/prices/${priceId}`));
  }
}
