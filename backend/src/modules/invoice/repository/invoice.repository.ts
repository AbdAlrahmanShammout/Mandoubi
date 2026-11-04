import { TransactionContext } from '@/common/base/transaction-context';
import { CreateInvoiceRepoInput } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';

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
  /** Moves an approved invoice to assigned. Returns false when it is not approved. */
  abstract markAssigned(id: number, context: TransactionContext): Promise<boolean>;
  /** Moves an assigned invoice to a delivery result. Returns false when it is not assigned. */
  abstract markDelivered(id: number, status: InvoiceStatus, context: TransactionContext): Promise<boolean>;
}
