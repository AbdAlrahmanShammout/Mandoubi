import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';

/**
 * Construction shape of one invoice assignment.
 */
export const DeliveryAssignmentZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  invoiceId: z.number(),
  driverId: z.number(),
  assignedByUserId: z.number(),
});

export type DeliveryAssignmentZodType = z.infer<typeof DeliveryAssignmentZodSchema>;
