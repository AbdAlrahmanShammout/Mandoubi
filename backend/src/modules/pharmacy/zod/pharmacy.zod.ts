import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Construction shape of a pharmacy profile.
 */
export const PharmacyZodSchema = BaseZodSchema.extend({
  name: z.string(),
  mobileNumber: z.string(),
  address: z.string(),
  status: z.nativeEnum(AccountStatus),
});

export type PharmacyZodType = z.infer<typeof PharmacyZodSchema>;
