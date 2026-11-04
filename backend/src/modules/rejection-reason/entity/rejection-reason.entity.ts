import { BaseEntity } from '@/common/base/base.entity';
import { RejectionReasonStatus } from '@/modules/rejection-reason/enum/rejection-reason-status.enum';
import { RejectionReasonZodType } from '@/modules/rejection-reason/zod/rejection-reason.zod';

/**
 * Reason an administrator can choose when rejecting an invoice.
 */
export class RejectionReasonEntity extends BaseEntity {
  label!: string;
  status!: RejectionReasonStatus;
  constructor(data: RejectionReasonZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
