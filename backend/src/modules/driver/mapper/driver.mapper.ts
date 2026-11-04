import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { DriverEntity } from '@/modules/driver/entity/driver.entity';
import { DriverType } from '@/modules/driver/types/driver-details-schema.type';

/**
 * Maps a driver row to the domain entity.
 */
export class DriverMapper {
  /**
   * Copies the persistence payload into a driver entity.
   */
  static toEntity(payload: DriverType): DriverEntity {
    return new DriverEntity({
      id: payload.id,
      name: payload.name,
      mobileNumber: payload.mobileNumber,
      status: payload.status as AccountStatus,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: payload.deletedAt,
    });
  }
}
