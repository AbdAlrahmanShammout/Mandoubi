import { Prisma } from '@prisma/client';
import { invoiceDetailsInclude } from '@/modules/invoice/types/invoice-details.include';

/** Order loaded with the pharmacy and each invoice's snapshotted lines. */
export const orderDetailsInclude = {
  pharmacy: true,
  invoices: { include: invoiceDetailsInclude, orderBy: { id: 'asc' } },
} satisfies Prisma.OrderInclude;
