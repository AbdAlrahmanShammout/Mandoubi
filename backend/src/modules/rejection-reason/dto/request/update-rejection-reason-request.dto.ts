import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * New label for an existing rejection reason.
 */
export class UpdateRejectionReasonRequestDto {
  @ApiProperty({ description: 'Reason shown when an invoice is rejected', example: 'Quantity is not available' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  label!: string;
}
