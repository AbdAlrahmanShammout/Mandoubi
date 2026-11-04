import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Pharmacy profile returned to the admin dashboard.
 */
export class PharmacyResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Al Shifa Pharmacy' })
  readonly name: string;
  @ApiProperty({ example: '0999123456' })
  readonly mobileNumber: string;
  @ApiProperty({ example: 'Baghdad Street, Damascus' })
  readonly address: string;
  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  readonly status: AccountStatus;
  constructor(pharmacy: PharmacyEntity) {
    super(pharmacy);
    this.name = pharmacy.name;
    this.mobileNumber = pharmacy.mobileNumber;
    this.address = pharmacy.address;
    this.status = pharmacy.status;
  }
}
