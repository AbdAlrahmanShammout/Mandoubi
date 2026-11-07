import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PageQueryDto } from '@/common/paging/page-query.dto';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';

/**
 * Manufacturer search. Name and status are applied before paging.
 */
export class ListManufacturersQueryDto extends PageQueryDto {
  @ApiPropertyOptional({ enum: ManufacturerStatus })
  @IsOptional()
  @IsEnum(ManufacturerStatus)
  status?: ManufacturerStatus;
}
