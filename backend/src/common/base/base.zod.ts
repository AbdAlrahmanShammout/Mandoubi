import { z } from 'zod';

/**
 * Identity and audit fields present on every persisted entity schema.
 */
export const BaseZodSchema = z.object({
  id: z.number(),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});
