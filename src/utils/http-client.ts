import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';
import { UpagJsConfig, UpagError } from '../types';

export class HttpClient {
  private client: AxiosInstance;

  constructor(config: UpagJsConfig) {
    const baseURL = config.baseURL || 'https://api.billing.upag.io/v1';
    
    this.client = axios.create({
      baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Authorization': `Bearer ${config.publicKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'upag-js/1.0.0',
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        throw this.handleError(error);
      }
    );
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.post<T>(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.put<T>(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.delete<T>(url, config);
    return response.data;
  }

  private handleError(error: AxiosError): UpagError {
    if (error.response) {
      // Server responded with error
      const data: any = error.response.data;
      return {
        type: data?.type || 'api_error',
        message: data?.message || error.message,
        code: data?.code,
        statusCode: error.response.status,
        details: data?.details,
      };
    } else if (error.request) {
      // Request made but no response
      return {
        type: 'network_error',
        message: 'No response received from server',
        statusCode: 0,
      };
    } else {
      // Error setting up request
      return {
        type: 'client_error',
        message: error.message,
      };
    }
  }
}

