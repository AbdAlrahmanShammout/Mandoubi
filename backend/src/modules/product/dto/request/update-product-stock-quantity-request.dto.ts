import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * New physical quantity for one warehouse.
 */
export class UpdateProductStockQuantityRequestDto {
  @ApiProperty({ description: 'Physical quantity in this warehouse', example: 40 })
  @IsInt()
  @Min(0)
  quantity!: number;
}
