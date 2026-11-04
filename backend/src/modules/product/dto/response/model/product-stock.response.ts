import { ApiProperty } from '@nestjs/swagger';
import { InternalException } from '@/common/exceptions/internal.exception';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';

/**
 * One warehouse quantity on a product.
 */
export class ProductStockResponse {
  @ApiProperty({ example: 1 })
  readonly id: number;
  @ApiProperty({ example: 2 })
  readonly warehouseId: number;
  @ApiProperty({ example: 'Damascus Central' })
  readonly warehouseName: string;
  @ApiProperty({ example: 20 })
  readonly quantity: number;
  @ApiProperty({ example: 4 })
  readonly reservedQuantity: number;
  @ApiProperty({ example: 16 })
  readonly availableQuantity: number;
  @ApiProperty({ example: true })
  readonly isPrimary: boolean;
  constructor(stock: ProductStockEntity) {
    if (!stock.warehouse) {
      throw new InternalException('The warehouse relation was not loaded');
    }
    this.id = stock.id;
    this.warehouseId = stock.warehouseId;
    this.warehouseName = stock.warehouse.name;
    this.quantity = stock.quantity;
    this.reservedQuantity = stock.reservedQuantity;
    this.availableQuantity = stock.quantity - stock.reservedQuantity;
    this.isPrimary = stock.isPrimary;
  }
}
