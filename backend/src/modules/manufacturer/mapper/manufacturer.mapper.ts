import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ManufacturerType } from '@/modules/manufacturer/types/manufacturer-details-schema.type';

/**
 * Maps a manufacturer row to the domain entity.
 */
export class ManufacturerMapper {
  /**
   * Copies the persistence payload into a manufacturer entity.
   */
  static toEntity(payload: ManufacturerType): ManufacturerEntity {
    return new ManufacturerEntity({
      id: payload.id,
      name: payload.name,
      status: payload.status as ManufacturerStatus,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: payload.deletedAt,
    });
  }
}
