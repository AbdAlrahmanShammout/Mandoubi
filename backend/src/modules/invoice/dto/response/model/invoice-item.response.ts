import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

/**
 * Snapshotted product line on an invoice.
 */
export class InvoiceItemResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly productId: number;
  @ApiProperty({ example: 'Paracetamol 500' })
  readonly productName: string;
  @ApiProperty({ example: '6281000000001' })
  readonly barcode: string;
  @ApiProperty({ enum: SaleUnit, example: SaleUnit.PACK })
  readonly saleUnit: SaleUnit;
  @ApiProperty({ example: 8 })
  readonly paidQuantity: number;
  @ApiProperty({ example: 2 })
  readonly freeQuantity: number;
  @ApiProperty({ example: 10 })
  readonly totalQuantity: number;
  @ApiProperty({ example: '15000.00' })
  readonly unitPrice: string;
  @ApiProperty({ example: '20000.00' })
  readonly consumerUnitPrice: string;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '120000.00' })
  readonly lineAmount: string;
  @ApiProperty({ example: 1 })
  readonly primaryWarehouseId: number;
  @ApiProperty({ example: 4, nullable: true })
  readonly offerPaidUnits: number | null;
  @ApiProperty({ example: 1, nullable: true })
  readonly offerFreeUnits: number | null;
  constructor(item: InvoiceItemEntity) {
    super(item);
    this.productId = item.productId;
    this.productName = item.productName;
    this.barcode = item.barcode;
    this.saleUnit = item.saleUnit;
    this.paidQuantity = item.paidQuantity;
    this.freeQuantity = item.freeQuantity;
    this.totalQuantity = item.totalQuantity;
    this.unitPrice = item.unitPrice;
    this.consumerUnitPrice = item.consumerUnitPrice;
    this.currency = item.currency;
    this.lineAmount = item.lineAmount;
    this.primaryWarehouseId = item.primaryWarehouseId;
    this.offerPaidUnits = item.offerPaidUnits;
    this.offerFreeUnits = item.offerFreeUnits;
  }
}
