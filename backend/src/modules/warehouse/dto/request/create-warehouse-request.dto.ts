import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Warehouse opened by an administrator.
 */
export class CreateWarehouseRequestDto {
  @ApiProperty({ description: 'Warehouse name', example: 'Damascus Central' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
  @ApiProperty({ description: 'Warehouse address', example: 'Industrial Zone, Damascus' })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  address!: string;
}
