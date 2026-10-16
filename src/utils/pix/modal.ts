import { OpenPixModalParams, PixModalHandle, PixModalResult } from '../../types';
import { copyText } from './copy';
import { PIX_MODAL_CSS, PIX_MODAL_CSS_ID } from './modal-css';

const COPY_LABEL = 'Copiar código';
const COPIED_LABEL = 'Copiado!';
const COPY_FAILED_LABEL = 'Não foi possível copiar';
const FEEDBACK_MS = 2000;
const TITLE_ID = 'upag-pix-title';

type CloseReason = PixModalResult['reason'];

// Only one Pix modal at a time.
let closeActive: ((reason: CloseReason) => void) | null = null;

/** Only `http(s):` and `data:image/` sources may load in the QR `<img>`. */
export function isSafeImageUrl(value: string): boolean {
  const url = value.trim();
  if (/^data:image\//i.test(url)) return true;
  try {
    const protocol = new URL(url).protocol;
    return protocol === 'https:' || protocol === 'http:';
  } catch {
    return false;
  }
}

function injectCss(): void {
  if (document.getElementById(PIX_MODAL_CSS_ID)) return;
  const style = document.createElement('style');
  style.id = PIX_MODAL_CSS_ID;
  style.textContent = PIX_MODAL_CSS;
  document.head.appendChild(style);
}

function formatAmount(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

function formatExpiry(iso: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  const day = `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`;
  return `Expira em ${day} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function focusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('button, [href], input, textarea, [tabindex]:not([tabindex="-1"])'));
}

/** Builds and shows the modal. Params must already be validated. */
export function openPixModal(params: OpenPixModalParams): PixModalHandle {
  closeActive?.('closed');

  injectCss();

  const previousFocus = document.activeElement as HTMLElement | null;
  const previousOverflow = document.body.style.overflow;

  const overlay = element('div', 'upag-pix-overlay');
  const dialog = element('div', 'upag-pix-dialog');
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', TITLE_ID);
  dialog.tabIndex = -1;

  const closeButton = element('button', 'upag-pix-close', '\u00d7');
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Fechar');

  const title = element('h2', 'upag-pix-title', 'Pague com Pix');
  title.id = TITLE_ID;

  dialog.append(closeButton, title);

  if (typeof params.amount === 'number' && Number.isFinite(params.amount)) {
    dialog.appendChild(element('p', 'upag-pix-amount', formatAmount(params.amount)));
  }

  const expiry = params.expiresAt ? formatExpiry(params.expiresAt) : null;
  if (expiry) dialog.appendChild(element('p', 'upag-pix-expires', expiry));

  if (params.qrCodeUrl) {
    const image = element('img', 'upag-pix-qr');
    image.alt = 'QR Code Pix';
    // The copia e cola is still payable if the image cannot load.
    image.addEventListener('error', () => {
      image.style.display = 'none';
    });
    image.src = params.qrCodeUrl;
    dialog.appendChild(image);
  }

  dialog.appendChild(element('p', 'upag-pix-hint', 'Ou copie o código e cole no app do seu banco:'));
  dialog.appendChild(element('p', 'upag-pix-code', params.copyPaste));

  const copyButton = element('button', 'upag-pix-copy', COPY_LABEL);
  copyButton.type = 'button';
  dialog.appendChild(copyButton);

  overlay.appendChild(dialog);

  let feedbackTimer: ReturnType<typeof setTimeout> | null = null;
  const showFeedback = (label: string) => {
    copyButton.textContent = label;
    if (feedbackTimer) clearTimeout(feedbackTimer);
    feedbackTimer = setTimeout(() => {
      feedbackTimer = null;
      copyButton.textContent = COPY_LABEL;
    }, FEEDBACK_MS);
  };

  let finished = false;
  let resolveClosed!: (result: PixModalResult) => void;
  const closed = new Promise<PixModalResult>((resolve) => {
    resolveClosed = resolve;
  });

  const finish = (reason: CloseReason) => {
    if (finished) return;
    finished = true;

    if (feedbackTimer) clearTimeout(feedbackTimer);
    document.removeEventListener('keydown', onKeyDown, true);
    overlay.parentNode?.removeChild(overlay);
    document.body.style.overflow = previousOverflow;
    if (closeActive === finish) closeActive = null;
    if (previousFocus && typeof previousFocus.focus === 'function') previousFocus.focus();

    resolveClosed({ reason });
  };

  function onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      finish('dismissed');
      return;
    }
    if (event.key !== 'Tab') return;

    const items = focusable(dialog);
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const current = document.activeElement;
    if (event.shiftKey && (current === first || current === dialog)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && current === last) {
      event.preventDefault();
      first.focus();
    }
  }

  closeButton.addEventListener('click', () => finish('dismissed'));
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) finish('dismissed');
  });
  copyButton.addEventListener('click', () => {
    void copyText(params.copyPaste).then((ok) => {
      if (!finished) showFeedback(ok ? COPIED_LABEL : COPY_FAILED_LABEL);
    });
  });
  document.addEventListener('keydown', onKeyDown, true);

  document.body.style.overflow = 'hidden';
  document.body.appendChild(overlay);
  copyButton.focus();

  closeActive = finish;

  return {
    close: () => finish('closed'),
    closed,
  };
}
