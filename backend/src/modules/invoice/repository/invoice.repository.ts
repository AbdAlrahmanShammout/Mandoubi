import { TransactionContext } from '@/common/base/transaction-context';
import { CreateInvoiceRepoInput } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';

/**
 * Optional note stored when an invoice is rejected.
 */
export interface RejectInvoiceRepoInput {
  readonly id: number;
  readonly rejectionReasonId: number | null;
  readonly customReason: string | null;
}

/**
 * Persistence contract for category invoices.
 */
export abstract class InvoiceRepository {
  /** Inserts one invoice and its snapshotted lines. */
  abstract create(input: CreateInvoiceRepoInput, context?: TransactionContext): Promise<InvoiceEntity>;
  /** Loads one invoice and its lines, or null when it is missing. */
  abstract findById(id: number, context?: TransactionContext): Promise<InvoiceEntity | null>;
  /** Moves a pending invoice to approved. Returns false when it is not pending. */
  abstract markApproved(id: number, context: TransactionContext): Promise<boolean>;
  /** Moves a pending invoice to rejected. Returns false when it is not pending. */
  abstract markRejected(input: RejectInvoiceRepoInput, context: TransactionContext): Promise<boolean>;
}
