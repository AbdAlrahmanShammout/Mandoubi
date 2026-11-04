import { Prisma } from '@prisma/client';

/** Payment loaded with the invoices it covers and whether it was handed over. */
export const paymentDetailsInclude = {
  allocations: true,
  settlementLine: true,
} satisfies Prisma.PaymentInclude;
