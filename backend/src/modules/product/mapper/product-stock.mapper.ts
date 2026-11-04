import { InternalException } from '@/common/exceptions/internal.exception';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';
import { ProductStockType } from '@/modules/product/types/product-details-schema.type';
import { WarehouseMapper } from '@/modules/warehouse/mapper/warehouse.mapper';

/**
 * Maps a product stock row to the domain entity.
 */
export class ProductStockMapper {
  /**
   * Copies the persistence payload into a stock entity. The warehouse must be loaded.
   */
  static toEntity(payload: ProductStockType): ProductStockEntity {
    const stock = new ProductStockEntity({
      id: payload.id,
      productId: payload.productId,
      warehouseId: payload.warehouseId,
      quantity: payload.quantity,
      isPrimary: payload.isPrimary,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
    if (!payload.warehouse) {
      throw new InternalException('The warehouse relation was not loaded');
    }
    stock.warehouse = WarehouseMapper.toEntity(payload.warehouse);
    return stock;
  }
}
