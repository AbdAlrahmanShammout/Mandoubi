import { TransactionContext } from './transaction-context';

/**
 * Opens one transaction that several repositories can share.
 * Services depend on this contract and never on the ORM client.
 */
export abstract class TransactionRunner {
  /**
   * Runs `work` inside a single database transaction.
   */
  abstract run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T>;
}
