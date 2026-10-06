import { CreateCardParams, UpagError } from '../types';

function invalid(message: string): UpagError {
  return { type: 'client_error', code: 'card_invalid', message };
}

function passesLuhn(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = digits.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/**
 * Checks a card before it leaves the browser, so an obvious typo costs no request.
 * Messages are fixed strings: they never quote the card data.
 * Throws `{ type: 'client_error', code: 'card_invalid' }`.
 */
export function validateCard(params: CreateCardParams, today: Date = new Date()): void {
  if (!params || typeof params !== 'object') {
    throw invalid('Card details are required');
  }

  const { number, expirationMonth, expirationYear, cvv, holderName } = params;

  if (typeof number !== 'string' || !/^\d{13,19}$/.test(number) || !passesLuhn(number)) {
    throw invalid('Card number is invalid');
  }

  if (!Number.isInteger(expirationMonth) || expirationMonth < 1 || expirationMonth > 12) {
    throw invalid('Expiration month must be between 1 and 12');
  }

  if (!Number.isInteger(expirationYear) || expirationYear < 1000 || expirationYear > 9999) {
    throw invalid('Expiration year must be a four-digit year');
  }

  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  if (expirationYear < year || (expirationYear === year && expirationMonth < month)) {
    throw invalid('Card is expired');
  }

  if (typeof cvv !== 'string' || !/^\d{3,4}$/.test(cvv)) {
    throw invalid('Security code must be 3 or 4 digits');
  }

  const name = typeof holderName === 'string' ? holderName.trim() : '';
  if (name.length < 2 || name.length > 64 || !/^[A-Za-z ]+$/.test(name)) {
    throw invalid('Holder name must be 2 to 64 letters and spaces');
  }
}
