import { BaseEntity } from '@/common/base/base.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { InvoiceItemZodType } from '@/modules/invoice/zod/invoice-item.zod';

/**
 * Price, currency, offer, quantity, and primary warehouse copied at submission.
 */
export class InvoiceItemEntity extends BaseEntity {
  invoiceId!: number;
  productId!: number;
  productName!: string;
  barcode!: string;
  saleUnit!: SaleUnit;
  paidQuantity!: number;
  freeQuantity!: number;
  totalQuantity!: number;
  unitPrice!: string;
  consumerUnitPrice!: string;
  currency!: InvoiceCurrency;
  lineAmount!: string;
  primaryWarehouseId!: number;
  offerPaidUnits!: number | null;
  offerFreeUnits!: number | null;
  constructor(data: InvoiceItemZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
