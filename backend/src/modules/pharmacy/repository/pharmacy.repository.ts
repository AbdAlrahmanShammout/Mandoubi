import { TransactionContext } from '@/common/base/transaction-context';
import { CreatePharmacyRepoInput, UpdatePharmacyStatusRepoInput } from '@/modules/pharmacy/defs/pharmacy-repository.defs';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';

/**
 * Persistence contract for pharmacy profiles.
 */
export abstract class PharmacyRepository {
  /** Inserts one pharmacy profile. */
  abstract create(input: CreatePharmacyRepoInput, context?: TransactionContext): Promise<PharmacyEntity>;
  /** Loads one pharmacy by id, or null when it is missing. */
  abstract findById(id: number): Promise<PharmacyEntity | null>;
  /** Loads one pharmacy by mobile number, or null when it is missing. */
  abstract findByMobileNumber(mobileNumber: string): Promise<PharmacyEntity | null>;
  /** Updates status and returns the pharmacy, or null when it is missing. */
  abstract updateStatus(input: UpdatePharmacyStatusRepoInput, context?: TransactionContext): Promise<PharmacyEntity | null>;
}
