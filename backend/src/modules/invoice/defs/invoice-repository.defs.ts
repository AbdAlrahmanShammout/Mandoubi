import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

/**
 * Snapshot written on one invoice line. Later product edits do not change it.
 */
export interface PreparedInvoiceItem {
  readonly productId: number;
  readonly productName: string;
  readonly barcode: string;
  readonly saleUnit: SaleUnit;
  readonly paidQuantity: number;
  readonly freeQuantity: number;
  readonly totalQuantity: number;
  readonly unitPrice: string;
  readonly consumerUnitPrice: string;
  readonly currency: InvoiceCurrency;
  readonly lineAmount: string;
  readonly primaryWarehouseId: number;
  readonly offerPaidUnits: number | null;
  readonly offerFreeUnits: number | null;
}

/**
 * Category invoice and the snapshotted lines written with it.
 */
export interface CreateInvoiceRepoInput {
  readonly orderId: number;
  readonly category: ProductCategory;
  readonly items: readonly PreparedInvoiceItem[];
}
