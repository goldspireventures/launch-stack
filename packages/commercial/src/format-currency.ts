/** Locale for grouping/decimals — comma thousands, dot decimals (e.g. €393,500). */
export const DISPLAY_CURRENCY_LOCALE = 'en-IE' as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
};

export function currencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency.toUpperCase()] ?? currency;
}

/**
 * Format minor units (e.g. cents) with the currency symbol **before** the amount.
 * Example: €20,000 (en-IE grouping, symbol-first).
 */
export function formatMinorUnits(minorUnits: number, currency = 'EUR'): string {
  const major = minorUnits / 100;
  const whole = minorUnits % 100 === 0;
  const numberPart = new Intl.NumberFormat(DISPLAY_CURRENCY_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(major);
  return `${currencySymbol(currency)}${numberPart}`;
}

/** @deprecated Use {@link formatMinorUnits}; kept for template-kit call sites. */
export function formatTemplatePriceCents(cents: number, currency = 'EUR', _locale?: string): string {
  return formatMinorUnits(Math.round(cents), currency);
}

export function formatEngagementPrice(minorUnits: number, currency: string): string {
  return formatMinorUnits(minorUnits, currency);
}
