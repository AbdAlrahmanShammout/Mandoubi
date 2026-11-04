import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { PharmacyType } from '@/modules/pharmacy/types/pharmacy-details-schema.type';

/**
 * Maps a pharmacy row to the domain entity.
 */
export class PharmacyMapper {
  /**
   * Copies the persistence payload into a pharmacy entity.
   */
  static toEntity(payload: PharmacyType): PharmacyEntity {
    return new PharmacyEntity({
      id: payload.id,
      name: payload.name,
      mobileNumber: payload.mobileNumber,
      address: payload.address,
      status: payload.status as AccountStatus,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: payload.deletedAt,
    });
  }
}
