import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Invoice an administrator sends back to its recorded warehouse.
 */
export class ReturnInvoiceRequestDto {
  @ApiProperty({ description: 'Invoice to return', example: 1 })
  @IsInt()
  @Min(1)
  invoiceId!: number;
}
