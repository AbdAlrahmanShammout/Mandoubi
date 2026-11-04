import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';
import { WarehouseType } from '@/modules/warehouse/types/warehouse-details-schema.type';

/**
 * Maps a warehouse row to the domain entity.
 */
export class WarehouseMapper {
  /**
   * Copies the persistence payload into a warehouse entity.
   */
  static toEntity(payload: WarehouseType): WarehouseEntity {
    return new WarehouseEntity({
      id: payload.id,
      name: payload.name,
      address: payload.address,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: payload.deletedAt,
    });
  }
}
