import { isSafeImageUrl, openPixModal } from '../utils/pix/modal';
import { OpenPixModalParams, PixModalHandle, UpagError } from '../types';

function clientError(code: string, message: string): UpagError {
  return { type: 'client_error', code, message };
}

/** Pix UI helpers. They make no API calls, so this resource needs no HTTP client. */
export class Pix {
  /**
   * Opens a modal with the Pix QR code and the copia e cola, with a button to copy it.
   * It only shows the payment: it does not detect it. Poll the charge yourself and
   * call `close()` once it is paid. Browser only (not during SSR).
   */
  openModal(params: OpenPixModalParams): PixModalHandle {
    if (!params || typeof params !== 'object') {
      throw clientError('invalid_params', 'Pix modal params are required');
    }
    if (typeof params.copyPaste !== 'string' || !params.copyPaste.trim()) {
      throw clientError('invalid_params', 'copyPaste is required');
    }
    if (params.qrCodeUrl != null && (typeof params.qrCodeUrl !== 'string' || !isSafeImageUrl(params.qrCodeUrl))) {
      throw clientError('invalid_params', 'qrCodeUrl must be an http(s) URL');
    }
    if (params.amount != null && (typeof params.amount !== 'number' || !Number.isFinite(params.amount))) {
      throw clientError('invalid_params', 'amount must be a number in cents');
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      throw clientError('unsupported_environment', 'The Pix modal is only available in browser environments');
    }

    return openPixModal(params);
  }
}
