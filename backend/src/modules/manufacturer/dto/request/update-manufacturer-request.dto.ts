import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * New name for an existing manufacturer.
 */
export class UpdateManufacturerRequestDto {
  @ApiProperty({ description: 'Manufacturer name', example: 'Ibn Al Haytham Pharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
}
