import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';

/**
 * Construction shape of a managed rejection reason.
 */
export const RejectionReasonZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  label: z.string(),
  status: z.nativeEnum(RejectionReasonStatus),
});

export type RejectionReasonZodType = z.infer<typeof RejectionReasonZodSchema>;
