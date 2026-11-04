import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Construction shape of a driver profile.
 */
export const DriverZodSchema = BaseZodSchema.extend({
  name: z.string(),
  mobileNumber: z.string(),
  status: z.nativeEnum(AccountStatus),
});

export type DriverZodType = z.infer<typeof DriverZodSchema>;
