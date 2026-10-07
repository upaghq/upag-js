import { CHALLENGE_MODAL_CSS } from './challenge-css';
import { marlimApiOrigin } from './origins';
import { Env } from './types';

declare global {
  interface Window {
    challengeModalKeyHandler?: (event: KeyboardEvent) => void;
  }
}

const CHALLENGE_IFRAME_NAME = 'step-up-iframe';
const CHALLENGE_FORM_ID = 'step-up-form';
const OVERLAY_ID = 'challenge-modal-overlay';

const WINDOW_SIZE_MAP: Record<string, { width: number; height: number }> = {
  '01': { width: 400, height: 250 },
  '02': { width: 400, height: 390 },
  '03': { width: 600, height: 500 },
  '04': { width: 400, height: 600 },
};

export interface ChallengeConfig {
  url: string;
  accessToken: string;
  windowSize: string;
  env: Env;
}

function injectCss(): void {
  if (document.getElementById('challenge-modal-css')) return;
  const style = document.createElement('style');
  style.id = 'challenge-modal-css';
  style.innerHTML = CHALLENGE_MODAL_CSS;
  document.head.appendChild(style);
}

function challengeSize(windowSize: string): { width: number; height: number } {
  if (windowSize === '05') {
    return {
      width: Math.min(0.9 * window.innerWidth, 1200),
      height: Math.min(0.9 * window.innerHeight, 800),
    };
  }
  return WINDOW_SIZE_MAP[windowSize] || WINDOW_SIZE_MAP['01'];
}

function removeNode(node: Element | null | undefined): void {
  if (node && node.parentNode) node.parentNode.removeChild(node);
}

function closeChallengeModal(
  iframe: Element | null | undefined,
  form: Element | null | undefined,
  overlay: Element | null | undefined,
  container: Element | null | undefined = null
): void {
  removeNode(iframe);
  removeNode(form);
  removeNode(overlay);
  removeNode(container);
  document.body.classList.remove('challenge-modal-open');
}

function registerEscapeHandler(): void {
  const handler = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      const overlay = document.getElementById(OVERLAY_ID);
      if (overlay) {
        overlay.classList.remove('show');
        document.body.classList.remove('challenge-modal-open');
        setTimeout(() => {
          closeChallengeModal(
            document.getElementsByName(CHALLENGE_IFRAME_NAME)[0],
            document.getElementById(CHALLENGE_FORM_ID),
            overlay,
            null
          );
        }, 300);
      }
    }
  };
  document.addEventListener('keydown', handler);
  window.challengeModalKeyHandler = handler;
}

function createChallengeMessageHandler(
  iframe: HTMLIFrameElement,
  form: HTMLFormElement,
  overlay: HTMLDivElement,
  container: HTMLDivElement,
  env: Env,
  resolve: () => void
): (event: MessageEvent) => void {
  const expectedOrigin = marlimApiOrigin(env);
  return (event: MessageEvent) => {
    try {
      if (expectedOrigin && event.origin !== expectedOrigin) return;
      if (event.data.status === 'completed') {
        console.log('Challenge completed');
        closeChallengeModal(iframe, form, overlay, container);
        resolve();
      }
    } catch (error) {
      console.error('Erro ao processar message do Session:', error);
    }
  };
}

export function processChallengeWithIframe(config: ChallengeConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    let iframe: HTMLIFrameElement | null = null;
    let form: HTMLFormElement | null = null;
    let overlay: HTMLDivElement | null = null;
    let container: HTMLDivElement | null = null;

    try {
      injectCss();
      const size = challengeSize(config.windowSize);

      overlay = document.createElement('div');
      overlay.id = OVERLAY_ID;
      overlay.className = 'challenge-modal-overlay';
      document.body.appendChild(overlay);

      container = document.createElement('div');
      container.id = 'challenge-modal-container';
      container.className = 'challenge-modal-container';
      container.style.width = `${size.width}px`;
      container.style.height = `${size.height}px`;

      iframe = document.createElement('iframe');
      iframe.name = CHALLENGE_IFRAME_NAME;
      iframe.className = 'challenge-modal-iframe';
      iframe.height = size.height.toString();
      iframe.width = size.width.toString();
      iframe.setAttribute('allowfullscreen', 'true');
      iframe.setAttribute('frameborder', '0');

      form = document.createElement('form');
      form.id = CHALLENGE_FORM_ID;
      form.target = CHALLENGE_IFRAME_NAME;
      form.method = 'POST';
      form.action = config.url;
      form.style.display = 'none';
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = 'JWT';
      input.value = config.accessToken;
      form.appendChild(input);
      document.body.appendChild(form);

      const wrapper = document.createElement('div');
      wrapper.className = 'challenge-modal-wrapper';
      container.appendChild(iframe);
      wrapper.appendChild(container);
      overlay.appendChild(wrapper);

      registerEscapeHandler();

      document.body.classList.add('challenge-modal-open');
      setTimeout(() => {
        overlay?.classList.add('show');
      }, 10);

      const handler = createChallengeMessageHandler(iframe, form, overlay, container, config.env, resolve);
      window.addEventListener('message', handler, false);
      form.submit();
    } catch (error) {
      console.error('Erro ao processar desafio de autenticação:', error);
      closeChallengeModal(iframe, form, overlay, container);
      reject(error);
    }
  });
}
