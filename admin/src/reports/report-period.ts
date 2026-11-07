export interface ReportPeriodInput {
  readonly from: string;
  readonly to: string;
}

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;
const DEFAULT_PERIOD_DAYS = 30;

/**
 * Inclusive local dates for the last 30 days, including today.
 */
export function defaultPeriodDates(): { readonly from: string; readonly to: string } {
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (DEFAULT_PERIOD_DAYS - 1));
  return { from: toDateKey(start), to: toDateKey(today) };
}

/**
 * Turns two calendar dates into an inclusive local-day range for the report API.
 * Returns null when a date is missing or the start is after the end.
 */
export function readReportPeriod(fromDate: string, toDate: string): ReportPeriodInput | null {
  const from = boundLocalDay(fromDate, false);
  const to = boundLocalDay(toDate, true);
  if (!from || !to || from > to) {
    return null;
  }
  return { from, to };
}

/**
 * Inclusive local-day bounds for one calendar date.
 */
export function localDayRange(value: string): { readonly from: string; readonly to: string } | null {
  const from = boundLocalDay(value, false);
  const to = boundLocalDay(value, true);
  if (!from || !to) {
    return null;
  }
  return { from, to };
}

function boundLocalDay(value: string, isEnd: boolean): string | null {
  if (!DATE_KEY.test(value)) {
    return null;
  }
  const date = new Date(`${value}T${isEnd ? '23:59:59.999' : '00:00:00'}`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

function toDateKey(date: Date): string {
  const pad = (part: number): string => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
