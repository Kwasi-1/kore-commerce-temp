/**
 * usePhoneFormatter.ts
 * Hook & utilities for standardizing Ghanaian and international phone numbers.
 *
 * Transforms raw numbers like:
 *   "0208501161"    -> "+233 20 850 1161"
 *   "233208501161"  -> "+233 20 850 1161"
 *   "+233208501161" -> "+233 20 850 1161"
 *   "0241234567"    -> "+233 24 123 4567"
 */

export interface PhoneFormatOptions {
  format?: 'international' | 'national';
  fallbackCountryCode?: string; // Default: '233'
}

export function formatPhoneNumber(
  phone?: string | null,
  options?: PhoneFormatOptions
): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (!trimmed) return '';

  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');

  if (!digits) return trimmed;

  const mode = options?.format || 'international';
  const defaultCode = options?.fallbackCountryCode || '233';

  let countryCode = '';
  let nationalNumber = '';

  // Case 1: Starts with 233 and is 12 digits (233 + 9 digits)
  if (digits.startsWith('233') && digits.length === 12) {
    countryCode = '233';
    nationalNumber = digits.slice(3);
  }
  // Case 2: Starts with 0 and is 10 digits (0 + 9 digits)
  else if (digits.startsWith('0') && digits.length === 10) {
    countryCode = defaultCode;
    nationalNumber = digits.slice(1);
  }
  // Case 3: 9 digits without prefix (e.g. 208501161)
  else if (digits.length === 9) {
    countryCode = defaultCode;
    nationalNumber = digits;
  }
  // Case 4: Non-standard / international numbers
  else {
    if (hasPlus) return `+${digits}`;
    if (digits.length >= 10 && !digits.startsWith('0')) return `+${digits}`;
    return trimmed;
  }

  // Format Ghana 9-digit national number: XX XXX XXXX
  let formattedNational = nationalNumber;
  if (nationalNumber.length === 9) {
    const net = nationalNumber.slice(0, 2);     // e.g. 20, 24, 55, 59
    const part1 = nationalNumber.slice(2, 5);   // e.g. 850, 123
    const part2 = nationalNumber.slice(5);      // e.g. 1161, 4567
    formattedNational = `${net} ${part1} ${part2}`;
  }

  if (mode === 'national') {
    return `0${formattedNational}`;
  }

  return `+${countryCode} ${formattedNational}`;
}

export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('0') && digits.length === 10) {
    return `233${digits.slice(1)}`;
  }
  return digits;
}

export function usePhoneFormatter() {
  return {
    formatPhone: formatPhoneNumber,
    cleanPhone: cleanPhoneNumber,
  };
}
