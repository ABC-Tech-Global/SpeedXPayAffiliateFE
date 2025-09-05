export function formatCurrency(
  value: number,
  opts?: { currency?: string; minimumFractionDigits?: number; maximumFractionDigits?: number }
) {
  const {
    currency = "VND",
    minimumFractionDigits = 0,
    maximumFractionDigits = 0,
  } = opts || {};
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(value);
  } catch {
    const rounded = Math.round(value);
    return `${rounded} ${currency === "VND" ? "₫" : currency}`.trim();
  }
}

export function formatDate(input: string | number | Date, locales?: string | string[], options?: Intl.DateTimeFormatOptions) {
  try {
    const date = input instanceof Date ? input : new Date(input);
    return date.toLocaleString(locales, options);
  } catch {
    return String(input);
  }
}

