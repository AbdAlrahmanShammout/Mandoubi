import { BaseEntity } from '@/common/base/base.entity';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { OrderZodType } from '@/modules/order/zod/order.zod';

/**
 * The submission a pharmacy sends. Invoices are the reviewable parts.
 */
export class OrderEntity extends BaseEntity {
  pharmacyId!: number;
  pharmacy?: PharmacyEntity;
  invoices?: InvoiceEntity[];
  constructor(data: OrderZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
