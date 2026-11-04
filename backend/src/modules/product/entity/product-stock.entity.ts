import { BaseEntity } from '@/common/base/base.entity';
import { ProductStockZodType } from '@/modules/product/zod/product-stock.zod';
import type { ProductEntity } from '@/modules/product/entity/product.entity';
import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';

/**
 * Quantity of one product in one warehouse.
 */
export class ProductStockEntity extends BaseEntity {
  productId!: number;
  warehouseId!: number;
  quantity!: number;
  isPrimary!: boolean;
  warehouse?: WarehouseEntity;
  product?: ProductEntity;
  constructor(data: ProductStockZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
