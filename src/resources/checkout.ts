import { BaseResource } from './base-resource';
import { HttpClient } from '../utils/http-client';
import {
  ApplyCheckoutCouponParams,
  CheckoutSession,
  CheckoutStartPayload,
  ConfirmCheckoutSessionParams,
  CreateCheckoutThreeDSecureSessionParams,
  CreatedCheckoutThreeDSecureSession,
  StartCheckoutSessionParams,
} from '../types';

export class Checkout extends BaseResource {
  constructor(http: HttpClient) {
    super(http, '/checkout/sessions');
  }

  /**
   * Opens a session from a payment-link code. No Authorization: the code
   * identifies the account. `clientSecret` is returned only here.
   */
  async start(code: string, tracking: StartCheckoutSessionParams = {}): Promise<CheckoutStartPayload> {
    return this.http.post<CheckoutStartPayload>(
      `/checkout/payment-links/${encodeURIComponent(code)}/sessions`,
      tracking,
      { auth: 'none' },
    );
  }

  /** Reloads the checkout page payload for one session. */
  async retrieve(sessionId: string, clientSecret: string): Promise<CheckoutSession> {
    return this.http.get<CheckoutSession>(this.sessionUrl(sessionId), this.shopperAuth(clientSecret));
  }

  /**
   * Charges the session. A card answers with the final status (`complete`, or
   * `open` when it was refused and can be retried); a pix stays `open` until paid.
   */
  async confirm(
    sessionId: string,
    clientSecret: string,
    body: ConfirmCheckoutSessionParams,
  ): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>(
      `${this.sessionUrl(sessionId)}/confirm`,
      body,
      this.shopperAuth(clientSecret),
    );
  }

  /**
   * Opens a 3D Secure session for this checkout, for a card tokenized with `cards.create`.
   * Run it with `threeDSecure.authenticate({ clientSecret })`, then confirm with the session
   * id as `charge.threeDSecureSession`. Answers 404 while 3D Secure is not enabled for the
   * account (see `account.threeDSecureEnabled`).
   */
  async createThreeDSecureSession(
    sessionId: string,
    clientSecret: string,
    body: CreateCheckoutThreeDSecureSessionParams,
  ): Promise<CreatedCheckoutThreeDSecureSession> {
    return this.http.post<CreatedCheckoutThreeDSecureSession>(
      `${this.sessionUrl(sessionId)}/3ds/session`,
      body,
      this.shopperAuth(clientSecret),
    );
  }

  async applyCoupon(
    sessionId: string,
    clientSecret: string,
    params: ApplyCheckoutCouponParams,
  ): Promise<CheckoutSession> {
    return this.http.post<CheckoutSession>(
      `${this.sessionUrl(sessionId)}/coupon`,
      params,
      this.shopperAuth(clientSecret),
    );
  }

  async removeCoupon(sessionId: string, clientSecret: string): Promise<CheckoutSession> {
    return this.http.delete<CheckoutSession>(
      `${this.sessionUrl(sessionId)}/coupon`,
      this.shopperAuth(clientSecret),
    );
  }

  /** Starts a session from a payment link and sends the browser to its hosted page. */
  async redirectToCheckout(code: string, tracking?: StartCheckoutSessionParams): Promise<void> {
    if (typeof window === 'undefined') {
      throw { type: 'client_error', message: 'redirectToCheckout is only available in browser environments' };
    }

    const payload = await this.start(code, tracking);
    if (!payload.url) {
      throw { type: 'client_error', message: 'The checkout session has no url' };
    }
    window.location.href = payload.url;
  }

  private sessionUrl(sessionId: string): string {
    return this.buildUrl(encodeURIComponent(sessionId));
  }

  private shopperAuth(clientSecret: string) {
    return { auth: { clientSecret } as const };
  }
}
