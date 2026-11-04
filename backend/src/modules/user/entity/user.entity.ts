import { BaseEntity } from '@/common/base/base.entity';
import { Principal } from '@/common/auth/principal.interface';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserZodType } from '@/modules/user/zod/user.zod';

/**
 * Credential account. The password hash never leaves this module's services.
 */
export class UserEntity extends BaseEntity implements Principal {
  role!: AccountRole;
  mobileNumber!: string;
  passwordHash!: string;
  status!: AccountStatus;
  pharmacyId!: number | null;
  driverId!: number | null;
  constructor(data: UserZodType) {
    super();
    Object.assign(this, data);
  }
}
