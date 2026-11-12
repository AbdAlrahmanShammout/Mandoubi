import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { toPharmacyProductView } from '@/modules/product/helpers/pharmacy-product-view.helper';

/**
 * Product the pharmacy can browse. Warehouse rows and the unused currency stay off this payload.
 */
export class PharmacyProductResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Paracetamol 500' })
  readonly name: string;
  @ApiProperty({ example: '6281000000001' })
  readonly barcode: string;
  @ApiProperty({ example: 'Ibn Al Haytham' })
  readonly manufacturerName: string;
  @ApiProperty({ example: 'Paracetamol' })
  readonly activeIngredient: string;
  @ApiProperty({ example: null, nullable: true })
  readonly imageUrl: string | null;
  @ApiProperty({ enum: ProductCategory, example: ProductCategory.NATIONAL_MEDICINE })
  readonly category: ProductCategory;
  @ApiProperty({ enum: SaleUnit, example: SaleUnit.PACK })
  readonly saleUnit: SaleUnit;
  @ApiProperty({ enum: ProductAvailability, example: ProductAvailability.AVAILABLE })
  readonly availability: ProductAvailability;
  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  readonly status: ProductStatus;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly invoiceCurrency: InvoiceCurrency;
  @ApiProperty({ example: '15000.00' })
  readonly pharmacyUnitPrice: string;
  @ApiProperty({ example: '20000.00' })
  readonly consumerUnitPrice: string;
  @ApiProperty({ example: 1 })
  readonly minimumOrderQuantity: number;
  @ApiProperty({ example: 20 })
  readonly maximumOrderQuantity: number;
  @ApiProperty({ example: 16 })
  readonly availableQuantity: number;
  @ApiProperty({ example: false })
  readonly limitedQuantity: boolean;
  @ApiProperty({ example: false })
  readonly offerActive: boolean;
  @ApiProperty({ example: 4, nullable: true })
  readonly offerPaidUnits: number | null;
  @ApiProperty({ example: 1, nullable: true })
  readonly offerFreeUnits: number | null;
  @ApiProperty({ example: '2026-11-01T00:00:00.000Z', nullable: true })
  readonly offerStartsAt: Date | null;
  @ApiProperty({ example: '2026-12-01T00:00:00.000Z', nullable: true })
  readonly offerEndsAt: Date | null;
  constructor(product: ProductEntity) {
    super(product);
    const view = toPharmacyProductView(product);
    this.name = view.name;
    this.barcode = view.barcode;
    this.manufacturerName = view.manufacturerName;
    this.activeIngredient = view.activeIngredient;
    this.imageUrl = view.imageUrl;
    this.category = view.category;
    this.saleUnit = view.saleUnit;
    this.availability = view.availability;
    this.status = view.status;
    this.invoiceCurrency = view.invoiceCurrency;
    this.pharmacyUnitPrice = view.pharmacyUnitPrice;
    this.consumerUnitPrice = view.consumerUnitPrice;
    this.minimumOrderQuantity = view.minimumOrderQuantity;
    this.maximumOrderQuantity = view.maximumOrderQuantity;
    this.availableQuantity = view.availableQuantity;
    this.limitedQuantity = view.limitedQuantity;
    this.offerActive = view.offerActive;
    this.offerPaidUnits = view.offerPaidUnits;
    this.offerFreeUnits = view.offerFreeUnits;
    this.offerStartsAt = view.offerStartsAt;
    this.offerEndsAt = view.offerEndsAt;
  }
}
