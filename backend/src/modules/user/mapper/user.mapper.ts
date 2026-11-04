import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';
import { UserType } from '@/modules/user/types/user-details-schema.type';
import { UserEntity } from '@/modules/user/entity/user.entity';

/**
 * Maps a user row to the domain entity.
 */
export class UserMapper {
  /**
   * Copies the persistence payload into a user entity.
   */
  static toEntity(payload: UserType): UserEntity {
    return new UserEntity({
      id: payload.id,
      role: payload.role as AccountRole,
      mobileNumber: payload.mobileNumber,
      passwordHash: payload.passwordHash,
      status: payload.status as AccountStatus,
      pharmacyId: payload.pharmacyId,
      driverId: payload.driverId,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: payload.deletedAt,
    });
  }
}
