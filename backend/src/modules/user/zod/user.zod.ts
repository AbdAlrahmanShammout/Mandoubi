import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Construction shape of a user entity.
 */
export const UserZodSchema = BaseZodSchema.extend({
  role: z.nativeEnum(AccountRole),
  mobileNumber: z.string(),
  passwordHash: z.string(),
  status: z.nativeEnum(AccountStatus),
  pharmacyId: z.number().nullable(),
  driverId: z.number().nullable(),
});

export type UserZodType = z.infer<typeof UserZodSchema>;
