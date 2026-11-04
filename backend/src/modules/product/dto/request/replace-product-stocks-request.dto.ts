import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, ValidateNested } from 'class-validator';
import { ProductStockRequestDto } from '@/modules/product/dto/request/product-stock-request.dto';

/**
 * Full set of warehouse quantities for one product.
 */
export class ReplaceProductStocksRequestDto {
  @ApiProperty({ description: 'Warehouse quantities that replace the current links', type: [ProductStockRequestDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductStockRequestDto)
  stocks!: ProductStockRequestDto[];
}
