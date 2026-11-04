import { BaseEntity } from '@/common/base/base.entity';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { DriverZodType } from '@/modules/driver/zod/driver.zod';

/**
 * Driver profile. Sign-in credentials live on the linked user account.
 */
export class DriverEntity extends BaseEntity {
  name!: string;
  mobileNumber!: string;
  status!: AccountStatus;
  constructor(data: DriverZodType) {
    super();
    Object.assign(this, data);
  }
}
