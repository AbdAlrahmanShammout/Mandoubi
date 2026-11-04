import { TransactionContext } from '@/common/base/transaction-context';

/**
 * Persistence contract for the one return recorded per invoice.
 */
export abstract class ReturnRecordRepository {
  /** Inserts the return row. A second insert for the same invoice conflicts. */
  abstract create(invoiceId: number, context: TransactionContext): Promise<void>;
}
