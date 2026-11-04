import { BaseEntity } from '@/common/base/base.entity';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { InvoiceZodType } from '@/modules/invoice/zod/invoice.zod';

/**
 * One category invoice belonging to a parent order.
 */
export class InvoiceEntity extends BaseEntity {
  orderId!: number;
  category!: ProductCategory;
  status!: InvoiceStatus;
  items?: InvoiceItemEntity[];
  constructor(data: InvoiceZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
