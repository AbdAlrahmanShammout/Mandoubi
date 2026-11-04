import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsInt, Min, ValidateNested } from 'class-validator';
import { MAX_ORDER_LINES } from '@/modules/order/constants/max-order-lines.constant';

/**
 * One product and the paid quantity the pharmacy is buying.
 */
export class OrderLineRequestDto {
  @ApiProperty({ description: 'Product to order', example: 1 })
  @IsInt()
  @Min(1)
  productId!: number;
  @ApiProperty({ description: 'Paid quantity. Free units are calculated from the offer', example: 4 })
  @IsInt()
  @Min(1)
  paidQuantity!: number;
}

/**
 * Products the pharmacy submits together. The server splits them by category.
 */
export class SubmitOrderRequestDto {
  @ApiProperty({ type: OrderLineRequestDto, isArray: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(MAX_ORDER_LINES)
  @ValidateNested({ each: true })
  @Type(() => OrderLineRequestDto)
  items!: OrderLineRequestDto[];
}
