import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';

/**
 * Construction shape of one pharmacy sign-in session.
 */
export const PharmacySessionZodSchema = BaseZodSchema.extend({
  pharmacyId: z.number(),
  revokedAt: z.date().nullable(),
});

export type PharmacySessionZodType = z.infer<typeof PharmacySessionZodSchema>;
