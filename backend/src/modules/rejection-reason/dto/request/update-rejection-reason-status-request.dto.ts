import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';

/**
 * Next status for a managed rejection reason.
 */
export class UpdateRejectionReasonStatusRequestDto {
  @ApiProperty({ description: 'Next rejection reason status', enum: RejectionReasonStatus, example: RejectionReasonStatus.DISABLED })
  @IsEnum(RejectionReasonStatus)
  status!: RejectionReasonStatus;
}
