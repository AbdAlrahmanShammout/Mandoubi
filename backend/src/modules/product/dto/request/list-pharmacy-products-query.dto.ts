import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/paging/page-query.dto';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';

/**
 * Pharmacy catalog search. Name, barcode, and category are applied before the page is cut.
 */
export class ListPharmacyProductsQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ProductCategory })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;
}
