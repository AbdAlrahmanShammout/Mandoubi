import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CUSTOM_REASON_MAX_LENGTH } from '@/modules/invoice/constants/custom-reason-max-length.constant';

/**
 * Optional managed reason and optional free-text note. Both may be omitted.
 */
export class RejectInvoiceRequestDto {
  @ApiPropertyOptional({ description: 'Managed rejection reason', example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  rejectionReasonId?: number;
  @ApiPropertyOptional({ description: 'Free-text rejection note', example: 'Call the pharmacy before the next order' })
  @IsOptional()
  @IsString()
  @MaxLength(CUSTOM_REASON_MAX_LENGTH)
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  customReason?: string;
}
