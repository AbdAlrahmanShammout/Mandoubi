import { Prisma } from '@prisma/client';
import { invoiceDetailsInclude } from '@/modules/invoice/types/invoice-details.include';

/** Assignment loaded with the invoice, its order, and the pharmacy to visit. */
export const deliveryAssignmentInclude = {
  invoice: {
    include: {
      ...invoiceDetailsInclude,
      order: { include: { pharmacy: true } },
    },
  },
} satisfies Prisma.DeliveryAssignmentInclude;
