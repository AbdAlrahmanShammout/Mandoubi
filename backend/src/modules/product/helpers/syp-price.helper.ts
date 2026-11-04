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

/**
 * Multiplies a unit price by a quantity and rounds to cents.
 */
export function multiplyMoney(unitPrice: string, quantity: number): string {
  return new Prisma.Decimal(unitPrice).mul(quantity).toDecimalPlaces(PRICE_SCALE, Prisma.Decimal.ROUND_HALF_UP).toFixed(PRICE_SCALE);
}

/**
 * Adds money amounts that already use two fraction digits.
 */
export function sumMoney(amounts: readonly string[]): string {
  const total = amounts.reduce((sum, amount) => sum.add(amount), new Prisma.Decimal(0));
  return total.toDecimalPlaces(PRICE_SCALE, Prisma.Decimal.ROUND_HALF_UP).toFixed(PRICE_SCALE);
}

/**
 * Subtracts one money amount from another and rounds to cents.
 */
export function subtractMoney(left: string, right: string): string {
  return new Prisma.Decimal(left).sub(right).toDecimalPlaces(PRICE_SCALE, Prisma.Decimal.ROUND_HALF_UP).toFixed(PRICE_SCALE);
}

/**
 * Compares two money amounts by value, ignoring trailing zeros.
 */
export function moneyEquals(left: string, right: string): boolean {
  return new Prisma.Decimal(left).equals(new Prisma.Decimal(right));
}
