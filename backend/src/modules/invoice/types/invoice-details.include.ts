import { Prisma } from '@prisma/client';

/** Invoice loaded with the snapshotted lines, oldest first. */
export const invoiceDetailsInclude = {
  items: { orderBy: { id: 'asc' } },
} satisfies Prisma.InvoiceInclude;
