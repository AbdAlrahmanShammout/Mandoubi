import { TransactionContext } from '@/common/base/transaction-context';
import { CreateInvoiceRepoInput } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';

/**
 * Persistence contract for category invoices.
 */
export abstract class InvoiceRepository {
  /** Inserts one invoice and its snapshotted lines. */
  abstract create(input: CreateInvoiceRepoInput, context?: TransactionContext): Promise<InvoiceEntity>;
  /** Loads one invoice and its lines, or null when it is missing. */
  abstract findById(id: number): Promise<InvoiceEntity | null>;
}
