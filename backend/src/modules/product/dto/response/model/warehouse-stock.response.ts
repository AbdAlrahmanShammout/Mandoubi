import { ApiProperty } from '@nestjs/swagger';
import { InternalException } from '@/common/exceptions/internal.exception';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';

/**
 * Product quantity recorded in one warehouse.
 */
export class WarehouseStockResponse {
  @ApiProperty({ example: 1 })
  readonly productId: number;
  @ApiProperty({ example: 'Paracetamol 500' })
  readonly productName: string;
  @ApiProperty({ example: '6281000000001' })
  readonly barcode: string;
  @ApiProperty({ example: 20 })
  readonly quantity: number;
  @ApiProperty({ example: true })
  readonly isPrimary: boolean;
  constructor(stock: ProductStockEntity) {
    if (!stock.product) {
      throw new InternalException('The product relation was not loaded');
    }
    this.productId = stock.productId;
    this.productName = stock.product.name;
    this.barcode = stock.product.barcode;
    this.quantity = stock.quantity;
    this.isPrimary = stock.isPrimary;
  }
}
