import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Quantity of a product in one warehouse.
 */
export class ProductStockRequestDto {
  @ApiProperty({ description: 'Warehouse that holds this quantity', example: 1 })
  @IsInt()
  @Min(1)
  warehouseId!: number;
  @ApiProperty({ description: 'Physical quantity in this warehouse', example: 20 })
  @IsInt()
  @Min(0)
  quantity!: number;
  @ApiPropertyOptional({ description: 'Whether this warehouse is the primary one', example: true })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}
