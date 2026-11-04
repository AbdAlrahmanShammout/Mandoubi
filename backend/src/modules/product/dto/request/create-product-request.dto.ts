import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { ProductStockRequestDto } from '@/modules/product/dto/request/product-stock-request.dto';

/**
 * Product opened by an administrator, including its warehouse quantities.
 */
export class CreateProductRequestDto {
  @ApiProperty({ description: 'Product name', example: 'Paracetamol 500' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name!: string;
  @ApiProperty({ description: 'Product barcode', example: '6281000000001' })
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  barcode!: string;
  @ApiProperty({ description: 'Selected manufacturer', example: 1 })
  @IsInt()
  @Min(1)
  manufacturerId!: number;
  @ApiProperty({ description: 'Active ingredient', example: 'Paracetamol' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  activeIngredient!: string;
  @ApiPropertyOptional({ description: 'Product image address', example: 'https://cdn.example.com/paracetamol.png' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;
  @ApiProperty({ description: 'Minimum quantity that can be ordered', example: 1 })
  @IsInt()
  @Min(1)
  minimumOrderQuantity!: number;
  @ApiProperty({ description: 'Maximum paid quantity that can be ordered', example: 100 })
  @IsInt()
  @Min(1)
  maximumOrderQuantity!: number;
  @ApiProperty({ description: 'Primary-warehouse quantity that shows a limited-stock alert', example: 5 })
  @IsInt()
  @Min(0)
  lowQuantityThreshold!: number;
  @ApiProperty({ description: 'Warehouse quantities. One warehouse is primary.', type: [ProductStockRequestDto] })
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ProductStockRequestDto)
  stocks!: ProductStockRequestDto[];
}
