import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';

/**
 * Construction shape of a manufacturer.
 */
export const ManufacturerZodSchema = BaseZodSchema.extend({
  name: z.string(),
  status: z.nativeEnum(ManufacturerStatus),
});

export type ManufacturerZodType = z.infer<typeof ManufacturerZodSchema>;
