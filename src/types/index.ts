// Configuration
export interface UpagJsConfig {
  /** Your public key (`pk_test_...` or `pk_live_...`). Never a secret key. */
  publicKey: string;
  /**
   * Overrides the API base URL (including `/v1`), mainly for local development.
   * Must be `https`, except for `localhost`. Takes precedence over the host
   * inferred from the key (`pk_test_` → sandbox, anything else → production).
   */
  baseURL?: string;
  /** Request timeout in ms (default 30000). */
  timeout?: number;
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
  customer: string | null;
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

// Catalog shapes nested on a checkout payload
export interface Product {
  id: string;
  name: string;
  description: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
}

export type BillingType = 'one_time' | 'recurring';
export type RecurringInterval = 'day' | 'week' | 'month' | 'year';

export interface Price {
  id: string;
  name: string;
  billingType: BillingType;
  interval: RecurringInterval | null;
  intervalCount: number | null;
  currency: string;
  /** Integer cents. */
  amount: number;
  metadata: Record<string, string | boolean>;
  createdAt: string;
  updatedAt: string;
}

export type CheckoutSessionPrice = Price & { product: Product | null };

export type CheckoutPaymentMethodType = 'pix' | 'card';

export type CheckoutSessionStatus = 'open' | 'complete' | 'expired';

export type BillingAddressCollection = 'auto' | 'required' | 'none';

export interface CheckoutSessionItem {
  id: string;
  quantity: number;
  price: CheckoutSessionPrice | null;
}

export interface CheckoutSessionBump {
  id: string;
  quantity: number;
  /** Integer cents. */
  amount: number;
  title: string | null;
  description: string | null;
  price: CheckoutSessionPrice | null;
}

export interface CheckoutSessionDiscount {
  id: string;
  item: string;
  coupon: string;
  type: 'coupon';
  /** Integer cents. */
  amount: number;
}

export interface CheckoutSession {
  id: string;
  customer: string | null;
  checkoutLayout: string | null;
  paymentLink: string | null;
  paymentMethods: CheckoutPaymentMethodType[];
  status: CheckoutSessionStatus;
  url: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  billingAddressCollection: BillingAddressCollection;
  successUrl: string | null;
  cancelUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  country: string | null;
  region: string | null;
  city: string | null;
  invoice: string | null;
  couponEnabled: boolean;
  couponCode: string | null;
  items: CheckoutSessionItem[];
  bumps: CheckoutSessionBump[];
  discounts: CheckoutSessionDiscount[];
}

export interface CheckoutInstallmentOption {
  installments: number;
  /** Integer cents for one installment. */
  amount: number;
  /** Integer cents for the whole charge. */
  total: number;
}

export type CheckoutAvailablePaymentMethod =
  | { type: 'pix' }
  | { type: 'card'; installments: CheckoutInstallmentOption[] };

export interface CheckoutAccount {
  displayName: string | null;
  legalName: string | null;
  email: string | null;
}

export interface CheckoutLayoutTheme {
  radius: string;
  font?: string;
  background: string;
  foreground: string;
  card: string;
  'card-foreground': string;
  popover: string;
  'popover-foreground': string;
  primary: string;
  'primary-foreground': string;
  secondary: string;
  'secondary-foreground': string;
  muted: string;
  'muted-foreground': string;
  accent: string;
  'accent-foreground': string;
  destructive: string;
  'destructive-foreground': string;
  success: string;
  'success-foreground': string;
  warning: string;
  'warning-foreground': string;
  border: string;
  input: string;
  ring: string;
}

export interface CheckoutLayout {
  theme: CheckoutLayoutTheme;
  favicon: string | null;
  desktop: Record<string, unknown> | null;
  mobile: Record<string, unknown> | null;
}

export type CheckoutPaymentStatus =
  | 'pending'
  | 'paid'
  | 'expired'
  | 'refunded'
  | 'partially_refunded'
  | 'failed'
  | 'in_review'
  | 'chargeback';

export interface CheckoutPayment {
  method: CheckoutPaymentMethodType;
  status: CheckoutPaymentStatus;
  qrCode: string | null;
  expiresAt: string | null;
}

/** Shopper checkout page payload. `clientSecret` is only on `start`. */
export interface CheckoutPayload {
  checkoutSession: CheckoutSession;
  paymentMethods: CheckoutAvailablePaymentMethod[];
  account: CheckoutAccount;
  layout: CheckoutLayout | null;
  publishableKey: string | null;
  payment: CheckoutPayment | null;
  /** When true, card pays must authenticate 3DS before confirm. */
  threeDSecureEnabled: boolean;
}

export interface CheckoutStartPayload extends CheckoutPayload {
  clientSecret: string;
}

export interface StartCheckoutSessionParams {
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  clickId?: string | null;
}

export interface CheckoutCustomerPhone {
  countryCode: string;
  areaCode: string;
  number: string;
}

export interface CheckoutCustomerDocument {
  type: 'cpf' | 'cnpj';
  number: string;
}

export interface CheckoutCustomerAddress {
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip?: string | null;
}

export interface ConfirmCheckoutCustomer {
  name: string;
  email?: string | null;
  phone?: CheckoutCustomerPhone | null;
  document: CheckoutCustomerDocument;
  address?: CheckoutCustomerAddress | null;
}

export interface ConfirmPixPayment {
  method: 'pix';
  dueDate?: string;
}

export interface ConfirmCardPayment {
  method: 'card';
  /** Tokenized card id from `cards.create`. */
  card: string;
  installments?: number;
  threeDSecureSession?: string;
  ipAddress?: string;
  location?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
    zip?: string | null;
  };
  softDescriptor?: string;
}

export interface ConfirmCheckoutSessionParams {
  customer: ConfirmCheckoutCustomer;
  bumps?: string[];
  payment: ConfirmPixPayment | ConfirmCardPayment;
}

export interface ApplyCheckoutCouponParams {
  code: string;
}

// 3D Secure
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
  /** Send this id to your backend as `threeDSecureSession` when creating the charge. */
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
