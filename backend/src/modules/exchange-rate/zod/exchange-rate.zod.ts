import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';

/**
 * Construction shape of the USD to Syrian-pound rate.
 */
export const ExchangeRateZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  usdToSyp: z.string(),
});

export type ExchangeRateZodType = z.infer<typeof ExchangeRateZodSchema>;
