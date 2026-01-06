import { HttpClient } from '../utils/http-client';

export abstract class BaseResource {
  protected http: HttpClient;
  protected basePath: string;

  constructor(http: HttpClient, basePath: string) {
    this.http = http;
    this.basePath = basePath;
  }

  protected buildUrl(path: string = ''): string {
    return path ? `${this.basePath}/${path}` : this.basePath;
  }

  protected buildQueryString(params?: Record<string, any>): string {
    if (!params || Object.keys(params).length === 0) {
      return '';
    }

    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        query.append(key, String(value));
      }
    });

    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
  }
}

