import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';

/**
 * Product fields an administrator can change. Warehouse quantities are separate.
 */
export class UpdateProductRequestDto {
  @ApiPropertyOptional({ description: 'Product name', example: 'Paracetamol 500' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  name?: string;
  @ApiPropertyOptional({ description: 'Product barcode', example: '6281000000001' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(64)
  barcode?: string;
  @ApiPropertyOptional({ description: 'Selected manufacturer', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  manufacturerId?: number;
  @ApiPropertyOptional({ description: 'Active ingredient', example: 'Paracetamol' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  activeIngredient?: string;
  @ApiPropertyOptional({ description: 'Product image address. Null clears it.', example: 'https://cdn.example.com/paracetamol.png', nullable: true })
  @IsOptional()
  @ValidateIf((_, value: unknown) => value !== null)
  @IsString()
  @MaxLength(500)
  imageUrl?: string | null;
  @ApiPropertyOptional({ description: 'Minimum quantity that can be ordered', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  minimumOrderQuantity?: number;
  @ApiPropertyOptional({ description: 'Maximum paid quantity that can be ordered', example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  maximumOrderQuantity?: number;
  @ApiPropertyOptional({ description: 'Primary-warehouse quantity that shows a limited-stock alert', example: 5 })
  @IsOptional()
  @IsInt()
  @Min(0)
  lowQuantityThreshold?: number;
  @ApiPropertyOptional({ description: 'Whether the product can currently be ordered', enum: ProductAvailability, example: ProductAvailability.AVAILABLE })
  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;
  @ApiPropertyOptional({ description: 'Whether ordering this product is enabled', enum: ProductStatus, example: ProductStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
