import { ApiProperty } from '@nestjs/swagger';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { PharmacyProductResponse } from '@/modules/product/dto/response/model/pharmacy-product.response';

/**
 * One product ranked by how much this pharmacy has requested.
 */
export class MostRequestedProductResponse {
  @ApiProperty({ example: 8 })
  readonly requestedQuantity: number;
  @ApiProperty({ type: PharmacyProductResponse })
  readonly product: PharmacyProductResponse;
  constructor(product: ProductEntity, requestedQuantity: number) {
    this.requestedQuantity = requestedQuantity;
    this.product = new PharmacyProductResponse(product);
  }
}
