import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';

/**
 * Construction shape of a warehouse.
 */
export const WarehouseZodSchema = BaseZodSchema.extend({
  name: z.string(),
  address: z.string(),
});

export type WarehouseZodType = z.infer<typeof WarehouseZodSchema>;
