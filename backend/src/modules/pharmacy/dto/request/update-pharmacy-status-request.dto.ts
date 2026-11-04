import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

/**
 * Next status for a pharmacy account.
 */
export class UpdatePharmacyStatusRequestDto {
  @ApiProperty({ description: 'Next account status', enum: AccountStatus, example: AccountStatus.DISABLED })
  @IsEnum(AccountStatus)
  status!: AccountStatus;
}
