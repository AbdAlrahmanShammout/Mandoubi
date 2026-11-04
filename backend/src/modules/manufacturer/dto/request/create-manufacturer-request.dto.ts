import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Name of a manufacturer opened by an administrator.
 */
export class CreateManufacturerRequestDto {
  @ApiProperty({ description: 'Manufacturer name', example: 'Ibn Al Haytham' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  name!: string;
}
