import { Prisma } from '@prisma/client';

const PRICE_SCALE = 2;

/**
 * Syrian-pound amount for a US-dollar price at the current exchange rate, rounded to cents.
 */
export function calculateSypPrice(usdAmount: string, usdToSyp: string): string {
  return new Prisma.Decimal(usdAmount).mul(usdToSyp).toDecimalPlaces(PRICE_SCALE, Prisma.Decimal.ROUND_HALF_UP).toFixed(PRICE_SCALE);
}

/**
 * Renders a stored money value with two fraction digits.
 */
export function formatMoney(value: Prisma.Decimal): string {
  return value.toDecimalPlaces(PRICE_SCALE, Prisma.Decimal.ROUND_HALF_UP).toFixed(PRICE_SCALE);
}
