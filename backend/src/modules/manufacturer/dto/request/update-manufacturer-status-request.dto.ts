import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';

/**
 * Next status for a manufacturer.
 */
export class UpdateManufacturerStatusRequestDto {
  @ApiProperty({ description: 'Next manufacturer status', enum: ManufacturerStatus, example: ManufacturerStatus.DISABLED })
  @IsEnum(ManufacturerStatus)
  status!: ManufacturerStatus;
}
