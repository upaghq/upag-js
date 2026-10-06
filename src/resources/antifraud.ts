import { HttpClient } from '../utils/http-client';
import { generateIdempotencyKey } from '../utils/idempotency';

const TAGS_URL = 'https://h.online-metrix.net/fp/tags.js';
const ORG_ID_PRODUCTION = '9ozphlqx';
const ORG_ID_SANDBOX = '45ssiuz3';
const SESSION_PREFIX = 'braspag_marlim_advanced';
const SCRIPT_ID = 'upag-antifraud';

/**
 * Device session for card risk. Starts when the client is constructed in a
 * browser. A `pk_test_` key uses the sandbox org; any other key uses production.
 *
 * Send `sessionId()` as `meta.session_id` on a card charge. Call `rotate()`
 * before a retry: a reused id lowers approval rates.
 */
export class Antifraud {
  private currentId = generateIdempotencyKey();

  constructor(private readonly http: HttpClient) {
    this.start();
  }

  sessionId(): string {
    return this.currentId;
  }

  /** A new id for the next payment attempt. */
  rotate(): string {
    this.currentId = generateIdempotencyKey();
    this.load();
    return this.currentId;
  }

  private start(): void {
    if (typeof document === 'undefined') return;
    if (document.head) {
      this.load();
      return;
    }
    document.addEventListener('DOMContentLoaded', () => this.load());
  }

  private load(): void {
    if (typeof document === 'undefined' || !document.head) return;

    document.getElementById(SCRIPT_ID)?.remove();

    const tag = document.createElement('script');
    tag.id = SCRIPT_ID;
    tag.async = true;
    tag.src = `${TAGS_URL}?org_id=${this.orgId()}&session_id=${SESSION_PREFIX}${this.currentId}`;
    document.head.appendChild(tag);
  }

  private orgId(): string {
    return this.http.environment === 'production' ? ORG_ID_PRODUCTION : ORG_ID_SANDBOX;
  }
}
