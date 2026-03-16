import { BaseResource } from './base-resource';
import { DataCollector } from '../utils/data-collector';
import {
  AntifraudSession,
  CreateAntifraudSessionParams,
} from '../types';

export class Antifraud extends BaseResource {
  private collector: DataCollector;

  constructor(http: any) {
    super(http, '/antifraud');
    this.collector = new DataCollector();
  }

  /**
   * Collect device/browser data and create an antifraud session.
   * If no params are provided, data is auto-collected from the browser.
   */
  async createSession(params?: CreateAntifraudSessionParams): Promise<AntifraudSession> {
    const data = params ?? await this.collector.collect();
    return this.http.post<AntifraudSession>(this.buildUrl('sessions'), data);
  }
}
