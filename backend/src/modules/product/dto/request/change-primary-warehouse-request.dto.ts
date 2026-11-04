import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Warehouse that becomes the only primary warehouse.
 */
export class ChangePrimaryWarehouseRequestDto {
  @ApiProperty({ description: 'Warehouse already linked to the product', example: 2 })
  @IsInt()
  @Min(1)
  warehouseId!: number;
}
