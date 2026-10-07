import { InitConfig } from './types';

let config: InitConfig | null = null;

export function setConfig(next: InitConfig): void {
  config = next;
}

export function getConfig(): InitConfig | null {
  return config;
}
