import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ShopifyCheckoutSnippet } from '../src/shopify-checkout';

function scriptTag(src: string): HTMLScriptElement {
  const script = document.createElement('script');
  script.src = src;
  document.body.appendChild(script);
  return script;
}

function stubLocation(pathname: string): { href: string; pathname: string } {
  const location = { href: `https://shop.test${pathname}`, pathname };
  Object.defineProperty(window, 'location', { configurable: true, value: location, writable: true });
  return location;
}

describe('ShopifyCheckoutSnippet', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('does nothing without pk or api', () => {
    ShopifyCheckoutSnippet.boot(scriptTag('https://js.upag.io/v1/shopify/checkout.min.js'));
    expect(fetch).not.toHaveBeenCalled();
  });

  it('posts the cart to the session endpoint and redirects', async () => {
    document.body.innerHTML = '<button name="checkout">Checkout</button>';
    const location = stubLocation('/cart');
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ variant_id: 11, quantity: 2 }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://checkout.test/cs/1/secret' }),
      } as Response);

    ShopifyCheckoutSnippet.boot(
      scriptTag('https://js.upag.io/v1/shopify/checkout.min.js?pk=pk_test_1&api=https://api.upag.io/v1/checkout'),
    );
    document.querySelector('button')!.click();

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.upag.io/v1/checkout/shopify/sessions');
    expect(JSON.parse(String(fetchMock.mock.calls[1]![1]?.body))).toEqual({
      publishableKey: 'pk_test_1',
      items: [{ variantId: '11', quantity: 2 }],
    });
    expect(location.href).toBe('https://checkout.test/cs/1/secret');
  });

  it('starts checkout from the cart page when skip_cart is set', async () => {
    stubLocation('/cart');
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ variant_id: 9, quantity: 1 }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ url: 'https://checkout.test/cs/2/secret' }),
      } as Response);

    ShopifyCheckoutSnippet.boot(
      scriptTag('https://js.upag.io/v1/shopify/checkout.min.js?pk=pk_live_1&api=https://api.upag.io/v1/checkout&skip_cart=1'),
    );

    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0]![0]).toBe('/cart.js');
  });
});
