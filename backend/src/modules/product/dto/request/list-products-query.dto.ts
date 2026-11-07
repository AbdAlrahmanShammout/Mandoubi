import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/paging/page-query.dto';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';

/**
 * Product search. Text, category, availability, and status are applied before paging.
 */
export class ListProductsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;
  @ApiPropertyOptional({ enum: ProductAvailability })
  @IsOptional()
  @IsEnum(ProductAvailability)
  availability?: ProductAvailability;
  @ApiPropertyOptional({ enum: ProductStatus })
  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;
}
