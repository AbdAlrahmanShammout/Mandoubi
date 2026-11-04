import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { RejectionReasonEntity } from '@/modules/rejection-reason/entity/rejection-reason.entity';
import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';

/**
 * Managed rejection reason returned to the admin dashboard.
 */
export class RejectionReasonResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Product is out of stock' })
  readonly label: string;
  @ApiProperty({ enum: RejectionReasonStatus, example: RejectionReasonStatus.ACTIVE })
  readonly status: RejectionReasonStatus;
  constructor(reason: RejectionReasonEntity) {
    super(reason);
    this.label = reason.label;
    this.status = reason.status;
  }
}
