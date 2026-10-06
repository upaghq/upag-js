const CHECKOUT_SELECTOR = [
  'button[name="checkout"]',
  'input[name="checkout"]',
  '[name="checkout"]',
  '#checkout',
  '.cart__checkout-button',
  'a[href*="/checkout"]',
  'a[href*="/cart?checkout"]',
  'form[action="/cart"] [type="submit"][name="checkout"]',
  'form[action*="/checkout"] [type="submit"]',
  '[data-shopify-checkout]',
].join(', ');

const CART_FORM_SELECTOR = 'form[action="/cart"], form[action*="/cart"]';
const ADD_TO_CART_FORM_SELECTOR = 'form[action*="/cart/add"]';
const ADD_TO_CART_BUTTON_SELECTOR = [
  'button[name="add"]',
  '.add-to-cart-button',
  '[data-testid="standalone-add-to-cart"]',
].join(', ');

const CART_TIMEOUT_MS = 5000;
const SESSION_TIMEOUT_MS = 20000;

interface ShopifyCartItem {
  variantId: string;
  quantity: number;
}

/**
 * Shopify ScriptTag snippet. Auto-runs from `document.currentScript`
 * (`?pk=&api=&skip_cart=`). Not part of the `upag-js` module surface.
 */
export class ShopifyCheckoutSnippet {
  static boot(script: HTMLScriptElement | null = document.currentScript as HTMLScriptElement | null): void {
    if (!script?.src) return;

    const params = new URL(script.src).searchParams;
    const pk = params.get('pk');
    const apiUrl = params.get('api');
    const skipCart = params.get('skip_cart') === '1';
    if (!pk || !apiUrl) return;

    new ShopifyCheckoutSnippet(pk, apiUrl, skipCart).start();
  }

  private redirecting = false;

  private constructor(
    private readonly pk: string,
    private readonly apiUrl: string,
    private readonly skipCart: boolean,
  ) {}

  private start(): void {
    if (document.readyState === 'complete') {
      this.bind();
      return;
    }
    window.addEventListener('load', () => this.bind());
  }

  private bind(): void {
    if (typeof document === 'undefined' || !document.body) return;
    if (this.skipCart && /^\/cart\/?$/.test(window.location.pathname)) this.beginCheckout();

    if (this.skipCart) {
      this.bindSkipCart();
      document.addEventListener('click', (event) => this.onAddToCartClick(event), true);
      document.addEventListener('submit', (event) => this.onAddToCartSubmit(event), true);
      new MutationObserver(() => this.bindSkipCart()).observe(document.body, { childList: true, subtree: true });
      return;
    }

    this.bindCheckoutButtons();
    new MutationObserver(() => this.bindCheckoutButtons()).observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  private isCheckoutSubmitter(element: EventTarget | null): boolean {
    if (!(element instanceof HTMLElement)) return false;
    if (element.getAttribute('name') === 'checkout') return true;
    if (element.id === 'checkout') return true;
    return element.classList.contains('cart__checkout-button');
  }

  private async readCart(): Promise<ShopifyCartItem[]> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CART_TIMEOUT_MS);
    try {
      const response = await fetch('/cart.js', {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
      });
      if (!response.ok) throw new Error('cart unavailable');
      const cart = (await response.json()) as { items?: Array<{ variant_id?: string | number; id?: string | number; quantity: number }> };
      return (cart.items ?? []).map((item) => ({
        variantId: String(item.variant_id || item.id),
        quantity: item.quantity,
      }));
    } finally {
      clearTimeout(timer);
    }
  }

  private async startCheckout(items: ShopifyCartItem[]): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SESSION_TIMEOUT_MS);
    try {
      const response = await fetch(`${this.apiUrl}/shopify/sessions`, {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publishableKey: this.pk, items }),
      });
      if (!response.ok) throw new Error('session failed');
      const data = (await response.json()) as { url?: string };
      if (!data?.url) throw new Error('no checkout url');
      window.location.href = data.url;
    } finally {
      clearTimeout(timer);
    }
  }

  private beginCheckout(): void {
    if (this.redirecting) return;
    this.redirecting = true;
    this.readCart()
      .then((items) => {
        if (!items.length) {
          this.redirecting = false;
          return;
        }
        return this.startCheckout(items);
      })
      .catch(() => {
        this.redirecting = false;
      });
  }

  private onCheckoutClick(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.beginCheckout();
  }

  private onCartFormSubmit(event: SubmitEvent): void {
    const submitter = event.submitter || document.activeElement;
    if (!this.skipCart && !this.isCheckoutSubmitter(submitter)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.beginCheckout();
  }

  private startCheckoutFromVariant(form: HTMLFormElement | null): void {
    const target = form ?? document.querySelector<HTMLFormElement>(ADD_TO_CART_FORM_SELECTOR);
    const variantInput = target?.querySelector<HTMLInputElement>('[name="id"]');
    if (!variantInput?.value) {
      this.beginCheckout();
      return;
    }
    if (this.redirecting) return;
    this.redirecting = true;
    const quantityInput = target?.querySelector<HTMLInputElement>('[name="quantity"]');
    const quantity = quantityInput ? Number.parseInt(quantityInput.value, 10) : 1;
    this.startCheckout([{
      variantId: String(variantInput.value),
      quantity: quantity > 0 ? quantity : 1,
    }]).catch(() => {
      this.redirecting = false;
    });
  }

  private redirectToCheckout(event: Event): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    this.beginCheckout();
  }

  private bindClick(selector: string, handler: (event: Event) => void): void {
    if (typeof document === 'undefined' || !document.body) return;
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (el.dataset.upagBound) continue;
      el.dataset.upagBound = '1';
      el.addEventListener('click', handler, true);
    }
  }

  private bindSkipCart(): void {
    this.bindClick('button[name="checkout"], input[name="checkout"]', (event) => this.redirectToCheckout(event));
    this.bindClick('a[href="/cart"], a[href$="/cart"]', (event) => this.redirectToCheckout(event));
    this.bindClick('button[form="cart"]', (event) => this.redirectToCheckout(event));
    this.bindClick('[data-testid="cart-drawer-trigger"]', (event) => this.redirectToCheckout(event));
  }

  private onAddToCartClick(event: Event): void {
    const target = event.target;
    const el = target instanceof Element ? target : (target as Node | null)?.parentElement;
    const button = el?.closest(ADD_TO_CART_BUTTON_SELECTOR);
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.startCheckoutFromVariant(button.closest('form'));
  }

  private onAddToCartSubmit(event: Event): void {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.matches(ADD_TO_CART_FORM_SELECTOR)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    this.startCheckoutFromVariant(form);
  }

  private bindCheckoutButtons(): void {
    this.bindClick(CHECKOUT_SELECTOR, (event) => this.onCheckoutClick(event));
    for (const form of document.querySelectorAll<HTMLFormElement>(CART_FORM_SELECTOR)) {
      if (form.dataset.upagCartBound) continue;
      form.dataset.upagCartBound = '1';
      form.addEventListener('submit', (event) => this.onCartFormSubmit(event), true);
    }
  }
}
