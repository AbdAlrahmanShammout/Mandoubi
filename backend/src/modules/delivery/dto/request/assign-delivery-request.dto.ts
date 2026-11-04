import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

/**
 * Approved invoice and the driver who will deliver it.
 */
export class AssignDeliveryRequestDto {
  @ApiProperty({ description: 'Approved invoice to assign', example: 1 })
  @IsInt()
  @Min(1)
  invoiceId!: number;
  @ApiProperty({ description: 'Driver who receives the invoice', example: 1 })
  @IsInt()
  @Min(1)
  driverId!: number;
}
