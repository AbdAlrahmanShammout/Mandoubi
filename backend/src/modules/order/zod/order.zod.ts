import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';

/**
 * Construction shape of a parent order.
 */
export const OrderZodSchema = BaseZodSchema.extend({
  pharmacyId: z.number(),
});

export type OrderZodType = z.infer<typeof OrderZodSchema>;
