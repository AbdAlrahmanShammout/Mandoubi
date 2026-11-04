import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Construction shape of one driver handover.
 */
export const DriverSettlementZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  driverId: z.number(),
  currency: z.nativeEnum(InvoiceCurrency),
  amount: z.string(),
  receivedByName: z.string(),
  occurredAt: z.date(),
});

export type DriverSettlementZodType = z.infer<typeof DriverSettlementZodSchema>;
