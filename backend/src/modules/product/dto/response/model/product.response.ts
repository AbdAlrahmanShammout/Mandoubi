import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { InternalException } from '@/common/exceptions/internal.exception';
import { ProductEntity } from '@/modules/product/entity/product.entity';
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
    this.availability = product.availability;
    this.status = product.status;
    this.stocks = product.stocks.map((stock) => new ProductStockResponse(stock));
  }
}
