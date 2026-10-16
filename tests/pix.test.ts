import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { UpagJs } from '../src/client';
import { Pix } from '../src/resources/pix';

const COPY_PASTE = '00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540510.005802BR5909Upag Test6009SAO PAULO62070503***6304ABCD';
const QR_URL = 'https://assets.upag.io/pix/qr.png';

const pix = new Pix();
const q = <T extends Element>(selector: string) => document.querySelector(selector) as T;

function press(key: string, init: KeyboardEventInit = {}) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }));
}

describe('Pix.openModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('is exposed on the client', () => {
    const upag = new UpagJs({ publicKey: 'pk_test_abc' });
    expect(upag.pix).toBeInstanceOf(Pix);
  });

  it('renders the dialog with QR, copia e cola, amount and expiry', () => {
    const modal = pix.openModal({
      qrCodeUrl: QR_URL,
      copyPaste: COPY_PASTE,
      amount: 1990,
      expiresAt: '2026-10-16T15:30:00.000Z',
    });

    const dialog = q<HTMLElement>('[role="dialog"]');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.textContent).toContain('Pague com Pix');
    expect(q<HTMLImageElement>('.upag-pix-qr').getAttribute('src')).toBe(QR_URL);
    expect(q('.upag-pix-code').textContent).toBe(COPY_PASTE);
    expect(q('.upag-pix-amount').textContent).toMatch(/R\$\s?19,90/);
    expect(q('.upag-pix-expires').textContent).toMatch(/^Expira em \d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    expect(document.body.style.overflow).toBe('hidden');

    modal.close();
  });

  it('shows only the copia e cola when there is no QR url', () => {
    pix.openModal({ qrCodeUrl: null, copyPaste: COPY_PASTE });

    expect(document.querySelector('.upag-pix-qr')).toBeNull();
    expect(document.querySelector('.upag-pix-amount')).toBeNull();
    expect(document.querySelector('.upag-pix-expires')).toBeNull();
    expect(q('.upag-pix-code').textContent).toBe(COPY_PASTE);
  });

  it('ignores an invalid expiry date', () => {
    pix.openModal({ copyPaste: COPY_PASTE, expiresAt: 'not-a-date' });
    expect(document.querySelector('.upag-pix-expires')).toBeNull();
  });

  it('hides the image when it fails to load', () => {
    pix.openModal({ qrCodeUrl: QR_URL, copyPaste: COPY_PASTE });
    const image = q<HTMLImageElement>('.upag-pix-qr');

    image.dispatchEvent(new Event('error'));

    expect(image.style.display).toBe('none');
    expect(q('.upag-pix-code').textContent).toBe(COPY_PASTE);
  });

  it('copies the exact code and shows feedback', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(async () => undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    pix.openModal({ copyPaste: COPY_PASTE });
    const button = q<HTMLButtonElement>('.upag-pix-copy');

    button.click();
    await vi.advanceTimersByTimeAsync(0);

    expect(writeText).toHaveBeenCalledWith(COPY_PASTE);
    expect(button.textContent).toBe('Copiado!');

    await vi.advanceTimersByTimeAsync(2100);
    expect(button.textContent).toBe('Copiar código');
  });

  it('falls back to execCommand when the clipboard API is missing', async () => {
    vi.stubGlobal('navigator', {});
    const exec = vi.fn(() => true);
    (document as any).execCommand = exec;
    pix.openModal({ copyPaste: COPY_PASTE });
    const button = q<HTMLButtonElement>('.upag-pix-copy');

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Copiado!'));

    expect(exec).toHaveBeenCalledWith('copy');
    expect(document.querySelector('textarea')).toBeNull();
    delete (document as any).execCommand;
  });

  it('reports a copy failure', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => { throw new Error('denied'); }) } });
    (document as any).execCommand = () => false;
    pix.openModal({ copyPaste: COPY_PASTE });
    const button = q<HTMLButtonElement>('.upag-pix-copy');

    button.click();
    await vi.waitFor(() => expect(button.textContent).toBe('Não foi possível copiar'));
    delete (document as any).execCommand;
  });

  it('closes on the X button as dismissed and cleans up', async () => {
    const modal = pix.openModal({ copyPaste: COPY_PASTE });

    q<HTMLButtonElement>('.upag-pix-close').click();

    await expect(modal.closed).resolves.toEqual({ reason: 'dismissed' });
    expect(document.querySelector('.upag-pix-overlay')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('closes on backdrop click but not on a click inside the dialog', async () => {
    const modal = pix.openModal({ copyPaste: COPY_PASTE });

    q<HTMLElement>('[role="dialog"]').click();
    expect(document.querySelector('.upag-pix-overlay')).not.toBeNull();

    q<HTMLElement>('.upag-pix-overlay').click();
    await expect(modal.closed).resolves.toEqual({ reason: 'dismissed' });
    expect(document.querySelector('.upag-pix-overlay')).toBeNull();
  });

  it('closes on Escape and stops listening afterwards', async () => {
    const modal = pix.openModal({ copyPaste: COPY_PASTE });

    press('Escape');

    await expect(modal.closed).resolves.toEqual({ reason: 'dismissed' });
    expect(document.querySelector('.upag-pix-overlay')).toBeNull();

    const next = pix.openModal({ copyPaste: COPY_PASTE });
    next.close();
    await expect(next.closed).resolves.toEqual({ reason: 'closed' });
  });

  it('close() resolves as closed and is idempotent', async () => {
    document.body.style.overflow = 'scroll';
    const modal = pix.openModal({ copyPaste: COPY_PASTE });

    modal.close();
    modal.close();

    await expect(modal.closed).resolves.toEqual({ reason: 'closed' });
    expect(document.querySelector('.upag-pix-overlay')).toBeNull();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('replaces a modal that is already open', async () => {
    const first = pix.openModal({ copyPaste: 'first-code' });
    const second = pix.openModal({ copyPaste: 'second-code' });

    await expect(first.closed).resolves.toEqual({ reason: 'closed' });
    expect(document.querySelectorAll('.upag-pix-overlay')).toHaveLength(1);
    expect(q('.upag-pix-code').textContent).toBe('second-code');
    expect(document.body.style.overflow).toBe('hidden');

    second.close();
    expect(document.body.style.overflow).toBe('');
  });

  it('injects the stylesheet once', () => {
    pix.openModal({ copyPaste: COPY_PASTE }).close();
    pix.openModal({ copyPaste: COPY_PASTE }).close();

    expect(document.querySelectorAll('#upag-pix-modal-css')).toHaveLength(1);
  });

  it('does not interpret HTML in the copia e cola', () => {
    const payload = '<img src=x onerror="window.__pwned = true">';
    pix.openModal({ copyPaste: payload });

    expect(q('.upag-pix-code').textContent).toBe(payload);
    expect(document.querySelectorAll('.upag-pix-code img')).toHaveLength(0);
    expect((window as any).__pwned).toBeUndefined();
  });

  it('rejects invalid params before touching the page', () => {
    expect(() => pix.openModal(undefined as any)).toThrowError(expect.objectContaining({ type: 'client_error', code: 'invalid_params' }));
    expect(() => pix.openModal({} as any)).toThrowError(expect.objectContaining({ code: 'invalid_params' }));
    expect(() => pix.openModal({ copyPaste: '   ' })).toThrowError(expect.objectContaining({ code: 'invalid_params' }));
    expect(() => pix.openModal({ copyPaste: 123 } as any)).toThrowError(expect.objectContaining({ code: 'invalid_params' }));
    expect(() => pix.openModal({ copyPaste: COPY_PASTE, qrCodeUrl: 'javascript:alert(1)' })).toThrowError(
      expect.objectContaining({ code: 'invalid_params' })
    );
    expect(() => pix.openModal({ copyPaste: COPY_PASTE, qrCodeUrl: 'data:text/html;base64,AAAA' })).toThrowError(
      expect.objectContaining({ code: 'invalid_params' })
    );
    expect(() => pix.openModal({ copyPaste: COPY_PASTE, amount: 'x' as any })).toThrowError(
      expect.objectContaining({ code: 'invalid_params' })
    );
    expect(document.querySelector('.upag-pix-overlay')).toBeNull();
  });

  it('accepts a data:image QR', () => {
    pix.openModal({ copyPaste: COPY_PASTE, qrCodeUrl: 'data:image/png;base64,iVBORw0KGgo=' });
    expect(q<HTMLImageElement>('.upag-pix-qr')).not.toBeNull();
  });

  it('throws unsupported_environment outside a browser', () => {
    vi.stubGlobal('window', undefined);

    expect(() => pix.openModal({ copyPaste: COPY_PASTE })).toThrowError(
      expect.objectContaining({ type: 'client_error', code: 'unsupported_environment' })
    );
  });
});
