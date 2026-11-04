import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Warehouse fields an administrator can change.
 */
export class UpdateWarehouseRequestDto {
  @ApiPropertyOptional({ description: 'Warehouse name', example: 'Damascus Central' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name?: string;
  @ApiPropertyOptional({ description: 'Warehouse address', example: 'Industrial Zone, Damascus' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  address?: string;
}
