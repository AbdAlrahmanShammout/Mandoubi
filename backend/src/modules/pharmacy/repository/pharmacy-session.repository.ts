import { TransactionContext } from '@/common/base/transaction-context';
import { CreatePharmacySessionRepoInput } from '@/modules/pharmacy/defs/pharmacy-session.defs';
import { PharmacySessionEntity } from '@/modules/pharmacy/entity/pharmacy-session.entity';

/**
 * Persistence contract for pharmacy sign-in sessions.
 */
export abstract class PharmacySessionRepository {
  /** Inserts one session. */
  abstract create(input: CreatePharmacySessionRepoInput, context?: TransactionContext): Promise<PharmacySessionEntity>;
  /** Loads one session by id, or null when it is missing. */
  abstract findById(id: number): Promise<PharmacySessionEntity | null>;
  /** Marks every active session for the pharmacy as revoked. */
  abstract revokeActiveByPharmacyId(pharmacyId: number, context?: TransactionContext): Promise<void>;
}
