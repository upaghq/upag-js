// Configuration
export interface UpagJsConfig {
  publicKey: string;
  baseURL?: string;
  timeout?: number;
}

// Common types
export interface ListResponse<T> {
  data: T[];
  hasMore: boolean;
  total?: number;
}

// Customer types (limited info for frontend)
export interface Customer {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
}

// Payment Method types
export type PaymentMethodType = 'credit_card' | 'pix' | 'boleto';

export interface PaymentMethod {
  id: string;
  customerId: string;
  type: PaymentMethodType;
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  pix?: {
    key?: string;
  };
  createdAt: Date;
}

export interface CreatePaymentMethodParams {
  customerId: string;
  type: PaymentMethodType;
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    holderName: string;
  };
}

export interface TokenizeCardParams {
  number: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  holderName: string;
}

export interface CardToken {
  id: string;
  card: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
  };
  createdAt: Date;
}

// Payment types (public info only)
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'canceled';

export interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethodType;
  description?: string | null;
  createdAt: Date;
}

export interface CreatePaymentParams {
  customerId: string;
  amount: number;
  currency?: string;
  paymentMethod: PaymentMethodType;
  paymentMethodId?: string;
  cardToken?: string;
  description?: string;
}

export interface ConfirmPaymentParams {
  paymentMethodId?: string;
  cardToken?: string;
}

// Checkout types
export interface CheckoutSession {
  id: string;
  url: string;
  status: 'open' | 'complete' | 'expired';
  customer?: Customer;
  amount: number;
  currency: string;
  successUrl: string;
  cancelUrl: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateCheckoutSessionParams {
  customerId?: string;
  customerEmail?: string;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  description?: string;
  paymentMethods?: PaymentMethodType[];
}

// Error types
export interface UpagError {
  type: string;
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}

