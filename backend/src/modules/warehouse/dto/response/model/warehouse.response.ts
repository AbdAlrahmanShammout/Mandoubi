import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';

/**
 * Warehouse returned to the admin dashboard.
 */
export class WarehouseResponse extends BaseModelResponse {
  @ApiProperty({ example: 'Damascus Central' })
  readonly name: string;
  @ApiProperty({ example: 'Industrial Zone, Damascus' })
  readonly address: string;
  constructor(warehouse: WarehouseEntity) {
    super(warehouse);
    this.name = warehouse.name;
    this.address = warehouse.address;
  }
}
