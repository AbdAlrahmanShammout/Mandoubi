import { BaseEntity } from '@/common/base/base.entity';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';
import { DeliveryEventZodType } from '@/modules/delivery/zod/delivery-event.zod';

/**
 * One recorded delivery result. Later results are new rows.
 */
export class DeliveryEventEntity extends BaseEntity {
  assignmentId!: number;
  invoiceId!: number;
  driverId!: number;
  result!: DeliveryResult;
  nonDeliveryReason!: NonDeliveryReason | null;
  note!: string | null;
  recipientName!: string | null;
  occurredAt!: Date;
  constructor(data: DeliveryEventZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
