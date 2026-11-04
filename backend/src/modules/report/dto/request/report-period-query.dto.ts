import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';

/**
 * Inclusive period used by the report queries.
 */
export class ReportPeriodQueryDto {
  @ApiProperty({ description: 'Period start', example: '2026-11-01T00:00:00.000Z' })
  @IsDateString()
  from!: string;
  @ApiProperty({ description: 'Period end', example: '2026-11-30T23:59:59.000Z' })
  @IsDateString()
  to!: string;
}

/**
 * Sales period with optional pharmacy and category filters.
 */
export class SalesReportQueryDto extends ReportPeriodQueryDto {
  @ApiPropertyOptional({ description: 'Limit the report to one pharmacy', example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pharmacyId?: number;
  @ApiPropertyOptional({ description: 'Limit the report to one category', enum: ProductCategory, example: ProductCategory.NATIONAL_MEDICINE })
  @IsOptional()
  @IsEnum(ProductCategory)
  category?: ProductCategory;
}
