const MONEY_PATTERN = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,2})?$/;
const RATE_PATTERN = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,4})?$/;

/**
 * Positive money amount accepted by the admin API, without grouping separators.
 */
export function normalizeMoney(value: string): string | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!MONEY_PATTERN.test(normalized) || Number(normalized) <= 0) {
    return null;
  }
  return normalized;
}

/**
 * Positive exchange rate with at most four fraction digits.
 */
export function normalizeRate(value: string): string | null {
  const normalized = value.replace(/,/g, '').trim();
  if (!RATE_PATTERN.test(normalized) || Number(normalized) <= 0) {
    return null;
  }
  return normalized;
}

/**
 * Whole number that is at least the given minimum.
 */
export function readInteger(value: string, minimum: number): number | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return null;
  }
  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed < minimum) {
    return null;
  }
  return parsed;
}

/**
 * Preview of a Syrian-pound price using the same half-up cent rounding as the server.
 */
export function previewSypPrice(usdAmount: string, usdToSyp: string): string {
  const usd = Number(usdAmount);
  const rate = Number(usdToSyp);
  if (!Number.isFinite(usd) || !Number.isFinite(rate) || usd <= 0 || rate <= 0) {
    return '';
  }
  return (Math.round(usd * rate * 100) / 100).toFixed(2);
}

/**
 * Local datetime value for an input from an ISO timestamp.
 */
export function toDateTimeLocal(value: string | null): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * ISO timestamp from a datetime-local input.
 */
export function fromDateTimeLocal(value: string): string | null {
  if (value.trim().length === 0) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Adds decimal money strings in cents so a receipt total stays exact.
 */
export function sumMoney(amounts: readonly string[]): string {
  const cents = amounts.reduce((total, amount) => total + readCents(amount), 0);
  const absolute = Math.abs(cents);
  const sign = cents < 0 ? '-' : '';
  return `${sign}${Math.floor(absolute / 100)}.${String(absolute % 100).padStart(2, '0')}`;
}

function readCents(amount: string): number {
  const [whole, fraction = ''] = amount.split('.');
  const negative = whole.startsWith('-');
  const digits = negative ? whole.slice(1) : whole;
  const cents = Number(digits || '0') * 100 + Number(`${fraction}00`.slice(0, 2));
  return negative ? -cents : cents;
}

/**
 * Arabic date and time for record timestamps.
 */
export function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat('ar-SY', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

/**
 * Arabic calendar date without a time.
 */
export function formatDate(value: Date): string {
  return new Intl.DateTimeFormat('ar-SY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(value);
}
