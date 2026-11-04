import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';

/**
 * Construction shape of one append-only delivery event.
 */
export const DeliveryEventZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  assignmentId: z.number(),
  invoiceId: z.number(),
  driverId: z.number(),
  result: z.nativeEnum(DeliveryResult),
  nonDeliveryReason: z.nativeEnum(NonDeliveryReason).nullable(),
  note: z.string().nullable(),
  recipientName: z.string().nullable(),
  occurredAt: z.date(),
});

export type DeliveryEventZodType = z.infer<typeof DeliveryEventZodSchema>;
