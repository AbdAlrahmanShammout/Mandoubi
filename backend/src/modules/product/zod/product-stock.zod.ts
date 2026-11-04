import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';

/**
 * Construction shape of one product quantity in one warehouse.
 */
export const ProductStockZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  productId: z.number(),
  warehouseId: z.number(),
  quantity: z.number(),
  isPrimary: z.boolean(),
});

export type ProductStockZodType = z.infer<typeof ProductStockZodSchema>;
