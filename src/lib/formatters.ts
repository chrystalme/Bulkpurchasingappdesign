/**
 * Currency and Number Formatting Utilities
 * Standardized for Nigerian Naira (₦) and localized number display.
 */

/**
 * Format a number or numeric string as localized currency.
 * Handles negative values with explicit sign placement (-₦1,500.00),
 * guards against NaN / null / undefined / Infinity.
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  currency: string = '₦'
): string {
  if (amount === null || amount === undefined || amount === '') {
    return `${currency}0.00`;
  }

  const num =
    typeof amount === 'string'
      ? parseFloat(amount.replace(/[^0-9.-]/g, ''))
      : amount;

  if (!isFinite(num) || isNaN(num)) {
    return `${currency}0.00`;
  }

  const isNegative = num < 0;
  const absVal = Math.abs(num);
  const formatted = absVal.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return isNegative ? `-${currency}${formatted}` : `${currency}${formatted}`;
}

/**
 * Safely parse a currency string (e.g. "₦1,250.50" or "-₦500") into a raw numeric float.
 */
export function parseCurrency(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') {
    return isFinite(value) && !isNaN(value) ? value : 0;
  }
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isFinite(parsed) && !isNaN(parsed) ? parsed : 0;
}

/**
 * Format a numeric value with commas and fixed decimal precision.
 */
export function formatNumber(
  val: number | string | null | undefined,
  decimals: number = 0
): string {
  if (val === null || val === undefined || val === '') return '0';
  const num =
    typeof val === 'string'
      ? parseFloat(val.replace(/[^0-9.-]/g, ''))
      : val;
  if (!isFinite(num) || isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Date formatting utilities.
 *
 * Dates reaching the UI come from the API, where fields are frequently optional
 * (escrow milestones, resolved disputes, last order dates, ...). Calling
 * `new Date(undefined).toLocaleDateString()` renders the literal string
 * "Invalid Date", so every date render goes through these guards instead.
 */

export type DateInput = string | number | Date | null | undefined;

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  ...DATE_OPTIONS,
  hour: '2-digit',
  minute: '2-digit',
};

const TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
};

/**
 * Parse anything date-ish into a valid Date, or null when it is empty or
 * unparseable (undefined, null, '', 'not-a-date', Invalid Date).
 */
export function parseDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

/** True when the value can be rendered as a real date. */
export function isValidDate(value: DateInput): boolean {
  return parseDate(value) !== null;
}

/**
 * Format a date as e.g. "10 Sep 2026". Returns `fallback` (default "—") for
 * missing or invalid input.
 */
export function formatDate(
  value: DateInput,
  locales?: string | string[],
  options: Intl.DateTimeFormatOptions = DATE_OPTIONS,
  fallback: string = '—'
): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString(locales, options) : fallback;
}

/**
 * Format a date and time as e.g. "10 Sep 2026, 14:21". Returns `fallback`
 * (default "—") for missing or invalid input.
 */
export function formatDateTime(
  value: DateInput,
  locales?: string | string[],
  options: Intl.DateTimeFormatOptions = DATE_TIME_OPTIONS,
  fallback: string = '—'
): string {
  const date = parseDate(value);
  return date ? date.toLocaleString(locales, options) : fallback;
}

/**
 * Format the time part only, e.g. "14:21". Returns `fallback` (default "—")
 * for missing or invalid input.
 */
export function formatTime(
  value: DateInput,
  locales?: string | string[],
  options: Intl.DateTimeFormatOptions = TIME_OPTIONS,
  fallback: string = '—'
): string {
  const date = parseDate(value);
  return date ? date.toLocaleTimeString(locales, options) : fallback;
}
