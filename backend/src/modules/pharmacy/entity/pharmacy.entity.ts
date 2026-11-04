import { BaseEntity } from '@/common/base/base.entity';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { PharmacyZodType } from '@/modules/pharmacy/zod/pharmacy.zod';

/**
 * Pharmacy profile. Sign-in credentials live on the linked user account.
 */
export class PharmacyEntity extends BaseEntity {
  name!: string;
  mobileNumber!: string;
  address!: string;
  status!: AccountStatus;
  constructor(data: PharmacyZodType) {
    super();
    Object.assign(this, data);
  }
}
