import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { DriverEntity } from '@/modules/driver/entity/driver.entity';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Driver profile returned to the admin dashboard.
 */
export class DriverResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Ahmad Ali' })
  readonly name: string;
  @ApiProperty({ example: '0999765432' })
  readonly mobileNumber: string;
  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  readonly status: AccountStatus;
  constructor(driver: DriverEntity) {
    super(driver);
    this.name = driver.name;
    this.mobileNumber = driver.mobileNumber;
    this.status = driver.status;
  }
}
