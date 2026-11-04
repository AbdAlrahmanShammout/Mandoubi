import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';

/**
 * Manufacturer returned to the admin dashboard.
 */
export class ManufacturerResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Ibn Al Haytham' })
  readonly name: string;
  @ApiProperty({ enum: ManufacturerStatus, example: ManufacturerStatus.ACTIVE })
  readonly status: ManufacturerStatus;
  constructor(manufacturer: ManufacturerEntity) {
    super(manufacturer);
    this.name = manufacturer.name;
    this.status = manufacturer.status;
  }
}
