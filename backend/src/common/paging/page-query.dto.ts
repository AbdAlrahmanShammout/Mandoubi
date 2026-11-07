import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { MAX_PAGE_LIMIT } from '@/common/paging/page';

/**
 * Shared search and page query for admin lists.
 */
export class PageQueryDto {
  @ApiPropertyOptional({ description: 'Page size. Defaults to 20.', example: 20, maximum: MAX_PAGE_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_LIMIT)
  limit?: number;
  @ApiPropertyOptional({ description: 'Number of matching rows to skip.', example: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
  @ApiPropertyOptional({ description: 'Text matched by the list before the page is cut.', example: 'paracetamol' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => trimToUndefined(value))
  @IsString()
  @MaxLength(80)
  search?: string;
}

function trimToUndefined(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
