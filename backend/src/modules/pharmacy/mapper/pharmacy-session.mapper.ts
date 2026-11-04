import { PharmacySessionEntity } from '@/modules/pharmacy/entity/pharmacy-session.entity';
import { PharmacySessionType } from '@/modules/pharmacy/types/pharmacy-session-details-schema.type';

/**
 * Maps a pharmacy session row to the domain entity.
 */
export class PharmacySessionMapper {
  /**
   * Copies the persistence payload into a pharmacy session entity.
   */
  static toEntity(payload: PharmacySessionType): PharmacySessionEntity {
    return new PharmacySessionEntity({
      id: payload.id,
      pharmacyId: payload.pharmacyId,
      revokedAt: payload.revokedAt,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: null,
    });
  }
}
