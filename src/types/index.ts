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

/** Nested product on a shopper checkout line. No timestamps. */
export interface CheckoutSessionProduct {
  id: string;
  name: string;
  description: string;
  image: string | null;
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

/** Nested price on a shopper checkout line. No metadata or timestamps. */
export interface CheckoutSessionPrice {
  id: string;
  name: string;
  billingType: BillingType;
  interval: RecurringInterval | null;
  intervalCount: number | null;
  currency: string;
  /** Integer cents. */
  amount: number;
  product: CheckoutSessionProduct | null;
}

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

export type CheckoutInvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface CheckoutInvoiceItem {
  id: string;
  product: string;
  price: string;
  name: string;
  /** Integer cents. */
  amount: number;
  quantity: number;
  /** Integer cents. */
  totalAmount: number;
}

export interface CheckoutInvoiceDiscount {
  id: string;
  item: string;
  coupon: string;
  type: 'coupon';
  /** Integer cents. */
  amount: number;
}

/** `ChargeResourceMapper.toEventResource` — public charge shape. */
export interface CheckoutCharge {
  id: string;
  type: CheckoutPaymentMethodType;
  status: CheckoutPaymentStatus;
  /** Integer cents. */
  amount: number;
  failureCode: string | null;
  description: string | null;
  meta: Record<string, string> | null;
  customer: string;
  pix?: { reference: string | null; qrCode: string | null; expiresAt: string | null };
  card?: {
    id: string | null;
    installments: number | null;
    nsu: string | null;
    authorizationCode: string | null;
    acquirerStatusCode: string | null;
  };
  splits: Array<{
    id: string;
    type: 'mdr' | 'account';
    status: 'pending' | 'processing' | 'paid' | 'failed';
    amount: number;
    account?: string;
    createdAt: string;
    updatedAt: string;
  }>;
  ipAddress: string | null;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutInvoicePayment {
  /** Charge id on `GET /invoices`. Expanded charge on checkout confirm. */
  charge: string | CheckoutCharge;
  type: CheckoutPaymentMethodType;
  status: CheckoutPaymentStatus;
  settledAt: string | null;
  createdAt: string;
}

/** `CustomerResourceMapper.toResource` — expanded customer on confirm. */
export interface CheckoutCustomer {
  id: string;
  name: string;
  email: string | null;
  document: { number: string; type: 'cpf' | 'cnpj' };
  phone: { countryCode: string; areaCode: string; number: string } | null;
  address: {
    street: string | null;
    number: string | null;
    complement: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    zip: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

/** Expanded invoice on confirm. Retrieve keeps the invoice id string. */
export interface CheckoutInvoice {
  id: string;
  customer: string;
  paymentMethod: string | null;
  subscription: string | null;
  status: CheckoutInvoiceStatus;
  currency: string;
  description: string | null;
  /** Integer cents. */
  amountDue: number;
  /** Integer cents. */
  amountPaid: number;
  attemptCount: number;
  dueDate: string | null;
  paidAt: string | null;
  items: CheckoutInvoiceItem[];
  discounts: CheckoutInvoiceDiscount[];
  payments: CheckoutInvoicePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface CheckoutShopperCharge {
  id: string;
  type: CheckoutPaymentMethodType;
  status: CheckoutPaymentStatus;
  /** Authorized / acquirer amount (Charge.gross). Integer cents. */
  amount: number;
  /** Installment interest the payer bears. Integer cents. */
  interestAmount: number;
  installments: number;
  paidAt: string | null;
  card: { brand: string; last4: string } | null;
  pix: { copyPaste: string | null; expiresAt: string | null } | null;
  error: { code: string; message: string } | null;
  nextAction: null;
}

export interface CheckoutShopperInvoice {
  id: string;
  status: CheckoutInvoiceStatus;
}

export interface CheckoutShopperCustomer {
  id: string;
  name: string;
  email: string | null;
  document: { type: 'cpf' | 'cnpj'; number: string };
  phone?: { countryCode: string; areaCode: string; number: string };
  address?: CheckoutCustomerAddress;
}

export type CheckoutTrialInterval = 'day' | 'week' | 'month';

/** Whether a payment method is asked for when nothing is due today. */
export type CheckoutPaymentMethodCollection = 'always' | 'if_required';

/** Free period before the first charge of a subscription item. */
export interface CheckoutTrial {
  interval: CheckoutTrialInterval | null;
  intervalCount: number | null;
  /**
   * Before the session completes this is a preview (a relative trial is counted
   * from the moment the subscription is created). After, it is the real end.
   */
  endsAt: string | null;
}

export interface CheckoutSession {
  id: string;
  status: CheckoutSessionStatus;
  url: string | null;
  paymentLink: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  currency: string;
  /**
   * Integer cents. What the items cost today. Recurring items under a trial are
   * not charged yet and add nothing.
   */
  subtotal: number;
  discountAmount: number;
  amount: number;
  items: CheckoutSessionItem[];
  bumps: CheckoutSessionBump[];
  discounts: CheckoutSessionDiscount[];
  couponEnabled: boolean;
  couponCode: string | null;
  billingAddressCollection: BillingAddressCollection;
  /** `null` when the session has no trial. */
  trial: CheckoutTrial | null;
  paymentMethodCollection: CheckoutPaymentMethodCollection;
  successUrl: string | null;
  cancelUrl: string | null;
  layout: CheckoutLayout | null;
  paymentMethods: CheckoutAvailablePaymentMethod[];
  customer: CheckoutShopperCustomer | null;
  charge: CheckoutShopperCharge | null;
  invoice: CheckoutShopperInvoice | null;
  /** Populated only on start. `null` on retrieve, confirm and coupon. */
  clientSecret: string | null;
  account: CheckoutAccount;
}

export interface CheckoutInstallmentOption {
  count: number;
  /** First installment in cents. Later parcels are `Math.floor(total / count)`. */
  amount: number;
  /** What the acquirer is charged. Integer cents. */
  total: number;
}

export interface CheckoutAvailablePaymentMethod {
  type: CheckoutPaymentMethodType;
  interestRate: number;
  installments: CheckoutInstallmentOption[];
}

export interface CheckoutAccount {
  displayName: string | null;
  legalName: string | null;
  publishableKey: string;
  threeDSecureEnabled: boolean;
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
  theme: CheckoutLayoutTheme | null;
  favicon: string | null;
  desktop: Record<string, unknown> | null;
  mobile: Record<string, unknown> | null;
}

export type CheckoutAppType = 'integration' | 'custom';
export type CheckoutAppProvider = 'meta' | 'spedy' | 'utmify' | 'trackup' | 'shopify';

/** Public config of a checkout app. No credentials. */
export interface CheckoutPublicApp {
  type: CheckoutAppType;
  provider: CheckoutAppProvider;
  config: Record<string, unknown>;
}

export interface CheckoutPublicAppsResponse {
  data: CheckoutPublicApp[];
}

export interface StartShopifyCheckoutParams {
  items: Array<{ variantId: string; quantity: number }>;
}

export interface StartShopifyCheckoutResponse {
  url: string;
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
  charge: string | CheckoutCharge;
}

/** Shopper checkout page payload. Same shape for start, retrieve and confirm. */
export type CheckoutPayload = CheckoutSession;

/** Start is the shopper session with a populated `clientSecret`. */
export type CheckoutStartPayload = CheckoutSession & { clientSecret: string };

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

/**
 * A card to keep for the subscription when nothing is charged today (the trial
 * covers everything). Tokenize it with `cards.create` first.
 */
export interface ConfirmCheckoutPaymentMethod {
  type: 'card';
  /** Tokenized card id from `cards.create`. */
  card: string;
}

interface ConfirmCheckoutSessionBase {
  customer: ConfirmCheckoutCustomer;
  bumps?: string[];
}

/** Amount due today is above zero: pay it with `charge`. */
export interface ConfirmCheckoutSessionWithCharge extends ConfirmCheckoutSessionBase {
  charge: ConfirmPixPayment | ConfirmCardPayment;
  paymentMethod?: never;
}

/**
 * Amount due today is zero (a trial covers every item): nothing is charged, so
 * send no `charge`. `paymentMethod` is required when the session's
 * `paymentMethodCollection` is `always` and optional under `if_required`.
 */
export interface ConfirmCheckoutSessionWithPaymentMethod extends ConfirmCheckoutSessionBase {
  charge?: never;
  paymentMethod?: ConfirmCheckoutPaymentMethod;
}

export type ConfirmCheckoutSessionParams =
  | ConfirmCheckoutSessionWithCharge
  | ConfirmCheckoutSessionWithPaymentMethod;

export interface ApplyCheckoutCouponParams {
  code: string;
}

/**
 * Opens a 3D Secure session for the checkout. The amount comes from the session
 * (items, accepted bumps and coupon), never from the browser.
 */
export interface CreateCheckoutThreeDSecureSessionParams {
  /** Tokenized card id from `cards.create`. */
  card: string;
  /** 1 to 12. Defaults to 1. */
  installments?: number;
  /** The payer's data: a public payer cannot name an existing customer. */
  customer: ConfirmCheckoutCustomer;
  /** Ids of the session's bumps the payer accepted. */
  bumps?: string[];
  /** Sandbox only: always show the bank challenge. */
  forceChallenge?: boolean;
}

export interface CreatedCheckoutThreeDSecureSession {
  /** Send this id as `charge.threeDSecureSession` when you confirm. */
  id: string;
  status: ThreeDSecureSessionStatus;
  /** What the card will be charged, in cents. Fixed when the session is created. */
  finalAmount: number;
  card: string;
  expiresAt: string;
  /** Pass it to `threeDSecure.authenticate`. Shown only here. */
  clientSecret: string;
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
