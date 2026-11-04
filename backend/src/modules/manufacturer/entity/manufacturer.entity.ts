import { BaseEntity } from '@/common/base/base.entity';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ManufacturerZodType } from '@/modules/manufacturer/zod/manufacturer.zod';

/**
 * Manufacturer that can be selected on a product.
 */
export class ManufacturerEntity extends BaseEntity {
  name!: string;
  status!: ManufacturerStatus;
  constructor(data: ManufacturerZodType) {
    super();
    Object.assign(this, data);
  }
}
