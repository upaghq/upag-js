import { Env } from './types';
import { ddcAllowedOrigins, parseMessageData } from './origins';

const SESSION_IFRAME_NAME = 'session-iframe';
const SESSION_FORM_ID = 'session-form';

interface SessionConfig {
  env: Env;
  accessToken: string;
  dataCollectionUrl: string;
}

function createSessionIframe(): void {
  const iframe = document.createElement('iframe');
  iframe.name = SESSION_IFRAME_NAME;
  iframe.height = '1';
  iframe.width = '1';
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
}

function createSessionForm(dataCollectionUrl: string, accessToken: string): HTMLFormElement {
  const form = document.createElement('form');
  form.id = SESSION_FORM_ID;
  form.target = SESSION_IFRAME_NAME;
  form.method = 'POST';
  form.action = dataCollectionUrl;
  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'JWT';
  input.value = accessToken;
  form.appendChild(input);
  document.body.appendChild(form);
  return form;
}

function createMessageHandler(
  env: Env,
  dataCollectionUrl: string,
  resolve: () => void,
  cleanup: () => void
): (event: MessageEvent) => void {
  const allowed = ddcAllowedOrigins(env, dataCollectionUrl);
  return (event: MessageEvent) => {
    try {
      if (!allowed.has(event.origin)) return;
      const parsed = parseMessageData(event.data);
      if (parsed?.MessageType === 'profile.completed') {
        console.log('Profile completed');
        cleanup();
        resolve();
      }
    } catch (error) {
      console.error('Erro ao processar message do Session:', error);
    }
  };
}

export function processSessionHandler(sessionConfig: SessionConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    const { env, accessToken, dataCollectionUrl } = sessionConfig;
    let form: HTMLFormElement | null = null;
    let handler: ((event: MessageEvent) => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (handler) {
        window.removeEventListener('message', handler);
      }
    };

    try {
      createSessionIframe();
      form = createSessionForm(dataCollectionUrl, accessToken);
      handler = createMessageHandler(env, dataCollectionUrl, resolve, cleanup);
      window.addEventListener('message', handler, false);
      timer = setTimeout(() => {
        cleanup();
        console.warn(
          'Device data collection timed out before profile.completed. Continuing 3DS authentication.'
        );
        resolve();
      }, 10000);
      form.submit();
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
}
