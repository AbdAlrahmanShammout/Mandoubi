import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { InternalException } from '@/common/exceptions/internal.exception';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { ProductStockResponse } from '@/modules/product/dto/response/model/product-stock.response';

/**
 * Product returned to the admin dashboard, including each warehouse quantity.
 */
export class ProductResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Paracetamol 500' })
  readonly name: string;
  @ApiProperty({ example: '6281000000001' })
  readonly barcode: string;
  @ApiProperty({ example: 1 })
  readonly manufacturerId: number;
  @ApiProperty({ example: 'Ibn Al Haytham' })
  readonly manufacturerName: string;
  @ApiProperty({ example: 'Paracetamol' })
  readonly activeIngredient: string;
  @ApiProperty({ example: null, nullable: true })
  readonly imageUrl: string | null;
  @ApiProperty({ example: 1 })
  readonly minimumOrderQuantity: number;
  @ApiProperty({ example: 100 })
  readonly maximumOrderQuantity: number;
  @ApiProperty({ example: 5 })
  readonly lowQuantityThreshold: number;
  @ApiProperty({ example: '2.50' })
  readonly pharmacyPriceUsd: string;
  @ApiProperty({ example: '40000.00' })
  readonly pharmacyPriceSyp: string;
  @ApiProperty({ example: '3.00' })
  readonly consumerPriceUsd: string;
  @ApiProperty({ example: '50000.00' })
  readonly consumerPriceSyp: string;
  @ApiProperty({ example: false })
  readonly calculateSypFromRate: boolean;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly invoiceCurrency: InvoiceCurrency;
  @ApiProperty({ enum: ProductCategory, example: ProductCategory.NATIONAL_MEDICINE })
  readonly category: ProductCategory;
  @ApiProperty({ enum: SaleUnit, example: SaleUnit.PACK })
  readonly saleUnit: SaleUnit;
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
  @ApiProperty({ enum: ProductAvailability, example: ProductAvailability.AVAILABLE })
  readonly availability: ProductAvailability;
  @ApiProperty({ enum: ProductStatus, example: ProductStatus.ACTIVE })
  readonly status: ProductStatus;
  @ApiProperty({ type: [ProductStockResponse] })
  readonly stocks: ProductStockResponse[];
  constructor(product: ProductEntity) {
    super(product);
    if (!product.manufacturer || !product.stocks) {
      throw new InternalException('The product relations were not loaded');
    }
    this.name = product.name;
    this.barcode = product.barcode;
    this.manufacturerId = product.manufacturerId;
    this.manufacturerName = product.manufacturer.name;
    this.activeIngredient = product.activeIngredient;
    this.imageUrl = product.imageUrl;
    this.minimumOrderQuantity = product.minimumOrderQuantity;
    this.maximumOrderQuantity = product.maximumOrderQuantity;
    this.lowQuantityThreshold = product.lowQuantityThreshold;
    this.pharmacyPriceUsd = product.pharmacyPriceUsd;
    this.pharmacyPriceSyp = product.pharmacyPriceSyp;
    this.consumerPriceUsd = product.consumerPriceUsd;
    this.consumerPriceSyp = product.consumerPriceSyp;
    this.calculateSypFromRate = product.calculateSypFromRate;
    this.invoiceCurrency = product.invoiceCurrency;
    this.category = product.category;
    this.saleUnit = product.saleUnit;
    this.offerActive = product.offerActive;
    this.offerPaidUnits = product.offerPaidUnits;
    this.offerFreeUnits = product.offerFreeUnits;
    this.offerStartsAt = product.offerStartsAt;
    this.offerEndsAt = product.offerEndsAt;
    this.availability = product.availability;
    this.status = product.status;
    this.stocks = product.stocks.map((stock) => new ProductStockResponse(stock));
  }
}
