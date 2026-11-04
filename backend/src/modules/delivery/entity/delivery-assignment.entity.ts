import { BaseEntity } from '@/common/base/base.entity';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { DeliveryAssignmentZodType } from '@/modules/delivery/zod/delivery-assignment.zod';

/**
 * The driver an administrator assigned to one invoice.
 */
export class DeliveryAssignmentEntity extends BaseEntity {
  invoiceId!: number;
  driverId!: number;
  assignedByUserId!: number;
  orderId!: number;
  invoice?: InvoiceEntity;
  pharmacy?: PharmacyEntity;
  constructor(data: DeliveryAssignmentZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
