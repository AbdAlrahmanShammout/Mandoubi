import { TransactionContext } from '@/common/base/transaction-context';
import { CreateDriverRepoInput, UpdateDriverStatusRepoInput } from '@/modules/driver/defs/driver-repository.defs';
import { DriverEntity } from '@/modules/driver/entity/driver.entity';

/**
 * Persistence contract for driver profiles.
 */
export abstract class DriverRepository {
  /** Inserts one driver profile. */
  abstract create(input: CreateDriverRepoInput, context?: TransactionContext): Promise<DriverEntity>;
  /** Loads one driver by id, or null when it is missing. */
  abstract findById(id: number): Promise<DriverEntity | null>;
  /** Loads one driver by mobile number, or null when it is missing. */
  abstract findByMobileNumber(mobileNumber: string): Promise<DriverEntity | null>;
  /** Updates status and returns the driver, or null when it is missing. */
  abstract updateStatus(input: UpdateDriverStatusRepoInput, context?: TransactionContext): Promise<DriverEntity | null>;
}
