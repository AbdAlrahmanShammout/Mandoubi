import { TransactionContext } from '@/common/base/transaction-context';
import { CreateUserRepoInput, UpdateUserStatusByDriverRepoInput, UpdateUserStatusByPharmacyRepoInput } from '@/modules/user/defs/user-repository.defs';
import { UserEntity } from '@/modules/user/entity/user.entity';

/**
 * Persistence contract for credential accounts.
 */
export abstract class UserRepository {
  /**
   * Inserts one credential.
   */
  abstract create(input: CreateUserRepoInput, context?: TransactionContext): Promise<UserEntity>;
  /**
   * Loads one credential by id, or null when it is missing.
   */
  abstract findById(id: number): Promise<UserEntity | null>;
  /**
   * Loads one credential by mobile number, or null when it is missing.
   */
  abstract findByMobileNumber(mobileNumber: string): Promise<UserEntity | null>;
  /**
   * Updates the credential linked to a pharmacy. Returns false when none exists.
   */
  abstract updateStatusByPharmacyId(input: UpdateUserStatusByPharmacyRepoInput, context?: TransactionContext): Promise<boolean>;
  /**
   * Updates the credential linked to a driver. Returns false when none exists.
   */
  abstract updateStatusByDriverId(input: UpdateUserStatusByDriverRepoInput, context?: TransactionContext): Promise<boolean>;
}
