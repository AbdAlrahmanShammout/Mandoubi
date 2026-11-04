import { BaseEntity } from '@/common/base/base.entity';
import { WarehouseZodType } from '@/modules/warehouse/zod/warehouse.zod';

/**
 * Warehouse that stores product quantities. Warehouses have no sign-in account.
 */
export class WarehouseEntity extends BaseEntity {
  name!: string;
  address!: string;
  constructor(data: WarehouseZodType) {
    super();
    Object.assign(this, data);
  }
}
