import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Account projection safe to return to a caller. It has no password hash.
 */
export class UserResponse extends BaseModelResponse {
  @ApiProperty({ enum: AccountRole, example: AccountRole.ADMIN })
  readonly role: AccountRole;
  @ApiProperty({ example: '0999000000' })
  readonly mobileNumber: string;
  @ApiProperty({ enum: AccountStatus, example: AccountStatus.ACTIVE })
  readonly status: AccountStatus;
  constructor(user: UserEntity) {
    super(user);
    this.role = user.role;
    this.mobileNumber = user.mobileNumber;
    this.status = user.status;
  }
}
