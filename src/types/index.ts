// Configuration
export interface UpagJsConfig {
  publicKey: string;
  baseURL?: string;
  timeout?: number;
  /**
   * Environment of the core API, which serves 3D Secure. When omitted it follows the
   * key (`pk_test_` is sandbox, `pk_live_` is production) and defaults to production.
   */
  environment?: 'production' | 'sandbox';
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
  type: PaymentMethodType;
  card?: {
    number: string;
    expMonth: number;
    expYear: number;
    cvc: string;
    holderName: string;
  };
}

// Card types
export type CardBrand =
  | 'visa'
  | 'mastercard'
  | 'elo'
  | 'amex'
  | 'hipercard'
  | 'diners'
  | 'discover'
  | 'jcb'
  | 'aura'
  | 'unknown';

export type CardFunding = 'credit' | 'debit' | 'prepaid' | 'unknown';
export type CardWallet = 'apple_pay' | 'google_pay';
export type CardStatus = 'active' | 'invalid' | 'removed';

export interface Card {
  id: string;
  customerId: string | null;
  brand: CardBrand;
  firstDigits: string;
  lastDigits: string;
  holderName: string;
  expirationMonth: number;
  expirationYear: number;
  funding: CardFunding | null;
  wallet: CardWallet | null;
  status: CardStatus;
  /** ISO 8601 timestamps, as sent by the API. */
  createdAt: string;
  updatedAt: string;
}

export interface CreateCardParams {
  /** Card number, 13 to 19 digits, no spaces or dashes. */
  number: string;
  /** 1 to 12. */
  expirationMonth: number;
  /** Four-digit year. */
  expirationYear: number;
  /** Security code, 3 or 4 digits. */
  cvv: string;
  /** Letters and spaces only, 2 to 64 characters (no accents or punctuation). */
  holderName: string;
}

export interface CreateCardOptions {
  /** Sent as the `Idempotency-Key` header (max 255 characters). */
  idempotencyKey?: string;
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

export interface AntifraudSession {
  id: string;
  expiresAt: Date;
}

// 3D Secure types
export type ThreeDSecureSessionStatus =
  | 'requires_action'
  | 'completed'
  | 'failed'
  | 'canceled'
  | 'expired';

export interface AuthenticateThreeDSecureParams {
  /**
   * The `clientSecret` of a 3D Secure session your server created. It identifies
   * the session and authorizes this browser to work on it: pass it to the page and
   * to nobody else.
   */
  clientSecret: string;
}

export interface ThreeDSecureOptions {
  /** Maximum time for the whole browser authentication, in ms (default 10 minutes). */
  timeoutMs?: number;
  /** Progress callback, useful to show loading states. */
  onStatusChange?: (status: ThreeDSecureProgress) => void;
}

export type ThreeDSecureProgress = 'starting' | 'authenticating' | 'completing' | 'idle';

export interface ThreeDSecureNextAction {
  type: 'browser_authentication';
  token: string;
  environment: 'sandbox' | 'production';
  /** Opaque payload built by the server. Passed through as-is. */
  payload: Record<string, unknown>;
}

export interface ThreeDSecureSession {
  id: string;
  status: ThreeDSecureSessionStatus;
  nextAction?: ThreeDSecureNextAction | null;
}

export interface ThreeDSecureResult {
  /** Send this id to your backend as `threeDSecureSessionId` when creating the charge. */
  sessionId: string;
  status: 'completed';
}

// Error types
export interface UpagError {
  type: string;
  message: string;
  code?: string;
  statusCode?: number;
  details?: any;
}
