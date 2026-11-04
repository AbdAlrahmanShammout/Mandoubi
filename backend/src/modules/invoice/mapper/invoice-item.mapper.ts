import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { formatMoney } from '@/modules/product/helpers/syp-price.helper';
import { InvoiceItemType } from '@/modules/invoice/types/invoice-details-schema.type';

/**
 * Maps a snapshotted invoice line to the domain entity.
 */
export class InvoiceItemMapper {
  /**
   * Copies the stored price, currency, offer, quantity, and warehouse.
   */
  static toEntity(payload: InvoiceItemType): InvoiceItemEntity {
    return new InvoiceItemEntity({
      id: payload.id,
      invoiceId: payload.invoiceId,
      productId: payload.productId,
      productName: payload.productName,
      barcode: payload.barcode,
      saleUnit: payload.saleUnit as SaleUnit,
      paidQuantity: payload.paidQuantity,
      freeQuantity: payload.freeQuantity,
      totalQuantity: payload.totalQuantity,
      unitPrice: formatMoney(payload.unitPrice),
      consumerUnitPrice: formatMoney(payload.consumerUnitPrice),
      currency: payload.currency as InvoiceCurrency,
      lineAmount: formatMoney(payload.lineAmount),
      primaryWarehouseId: payload.primaryWarehouseId,
      offerPaidUnits: payload.offerPaidUnits,
      offerFreeUnits: payload.offerFreeUnits,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: null,
    });
  }
}
