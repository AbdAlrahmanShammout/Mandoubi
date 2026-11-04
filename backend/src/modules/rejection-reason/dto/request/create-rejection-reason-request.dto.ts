import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Label of a rejection reason managed by an administrator.
 */
export class CreateRejectionReasonRequestDto {
  @ApiProperty({ description: 'Reason shown when an invoice is rejected', example: 'Product is out of stock' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  label!: string;
}
