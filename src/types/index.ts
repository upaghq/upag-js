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

// Customer types
export interface Customer {
  id: string;
  livemode: boolean;
  name: string | null;
  email: string;
  phone: string | null;
  taxId: string | null;
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  zipCode: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCustomerParams {
  email: string;
  name: string;
  phone?: string;
  taxId?: string;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zipCode?: string | null;
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

// Product types
export interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Price types
export type BillingType = 'one_time' | 'recurring';
export type RecurringInterval = 'day' | 'week' | 'month' | 'year';

export interface Price {
  id: string;
  name: string;
  billingType: BillingType;
  interval: RecurringInterval | null;
  intervalCount: number | null;
  currency: string;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Checkout types
export interface CheckoutSessionProduct {
  id: string;
  name: string;
  description: string;
  image: string | null;
}

export interface CheckoutSessionPrice {
  id: string;
  name: string;
  billingType: BillingType;
  interval: RecurringInterval | null;
  intervalCount: number | null;
  currency: string;
  amount: number;
  product?: CheckoutSessionProduct;
}

export interface CheckoutSessionItem {
  id: string;
  priceId: string;
  quantity: number;
  price?: CheckoutSessionPrice;
}

export type BillingAddressCollection = 'auto' | 'required' | 'none';

export interface CheckoutSession {
  id: string;
  status: 'open' | 'complete' | 'expired';
  customerId: string | null;
  url: string;
  billingAddressCollection: BillingAddressCollection;
  successUrl: string | null;
  cancelUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
  items: CheckoutSessionItem[];
}

export interface CreateCheckoutSessionParams {
  customerId?: string | null;
  items: { priceId: string; quantity: number }[];
  paymentMethods?: PaymentMethodType[];
  billingAddressCollection?: BillingAddressCollection;
  successUrl?: string | null;
  cancelUrl?: string | null;
}

// Antifraud types
export interface AntifraudDeviceInfo {
  screenWidth?: number;
  screenHeight?: number;
  availWidth?: number;
  availHeight?: number;
  colorDepth?: number;
  pixelRatio?: number;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  maxTouchPoints?: number;
}

export interface AntifraudBrowserInfo {
  platform?: string;
  vendor?: string;
  language?: string;
  languages?: string[];
  cookieEnabled?: boolean;
  doNotTrack?: string | null;
  pdfViewerEnabled?: boolean;
}

export interface AntifraudTimeInfo {
  timezone?: string;
  timezoneOffset?: number;
}

export interface AntifraudHashesInfo {
  canvas?: string;
  webgl?: string;
  audio?: string;
  fonts?: string;
}

export interface AntifraudGraphicsInfo {
  webglRenderer?: string;
  webglVendor?: string;
}

export interface AntifraudConnectionInfo {
  type?: string;
  effectiveType?: string;
  downlink?: number;
}

export interface AntifraudBotInfo {
  webdriver?: boolean;
  automationFlags?: string[];
}

export interface CreateAntifraudSessionParams {
  fingerprint?: string;
  device?: AntifraudDeviceInfo;
  browser?: AntifraudBrowserInfo;
  time?: AntifraudTimeInfo;
  hashes?: AntifraudHashesInfo;
  graphics?: AntifraudGraphicsInfo;
  connection?: AntifraudConnectionInfo;
  bot?: AntifraudBotInfo;
}

export type AntifraudRiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface AntifraudSession {
  id: string;
  livemode: boolean;
  riskScore: number;
  riskLevel: AntifraudRiskLevel;
  riskFactors: string[];
  expiresAt: Date;
}

// Error types
export interface UpagError {
  type: string;
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}
