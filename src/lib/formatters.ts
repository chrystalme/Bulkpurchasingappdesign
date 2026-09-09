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
