import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { invoiceDetailsInclude } from '@/modules/invoice/types/invoice-details.include';

/** Persistence payload that can construct an invoice and its items. */
export type InvoiceType = OptionalRelations<Prisma.InvoiceGetPayload<{ include: typeof invoiceDetailsInclude }>>;

/** Persistence payload that can construct one invoice item. */
export type InvoiceItemType = OptionalRelations<Prisma.InvoiceItemGetPayload<object>>;
