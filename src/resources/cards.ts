import { BaseResource } from './base-resource';
import { HttpClient, RequestOptions } from '../utils/http-client';
import { Card, CreateCardOptions, CreateCardParams } from '../types';

export class Cards extends BaseResource {
  constructor(http: HttpClient) {
    super(http, '/cards');
  }

  /**
   * Tokenizes a card. Returns a card id to use when your server creates a charge;
   * the card number and security code are never returned.
   *
   * This is the only card operation a public key can perform. Listing, retrieving and
   * removing cards need your secret key, so do those from your server.
   */
  async create(params: CreateCardParams, options: CreateCardOptions = {}): Promise<Card> {
    const request: RequestOptions | undefined = options.idempotencyKey
      ? { headers: { 'Idempotency-Key': options.idempotencyKey } }
      : undefined;

    return this.http.post<Card>(this.basePath, params, request);
  }
}
