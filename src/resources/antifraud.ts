import { BaseResource } from './base-resource';
import { DataCollector } from '../utils/data-collector';
import { AntifraudSession } from '../types';

export class Antifraud extends BaseResource {
  private collector: DataCollector;

  constructor(http: any) {
    super(http, '/billing/antifraud');
    this.collector = new DataCollector();
  }

  async createSession(): Promise<AntifraudSession> {
    const data = await this.collector.collect();
    return this.http.post<AntifraudSession>(this.buildUrl('sessions'), data);
  }
}
