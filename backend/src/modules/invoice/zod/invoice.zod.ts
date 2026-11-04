import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';

/**
 * Construction shape of one category invoice.
 */
export const InvoiceZodSchema = BaseZodSchema.extend({
  orderId: z.number(),
  category: z.nativeEnum(ProductCategory),
  status: z.nativeEnum(InvoiceStatus),
});

export type InvoiceZodType = z.infer<typeof InvoiceZodSchema>;
