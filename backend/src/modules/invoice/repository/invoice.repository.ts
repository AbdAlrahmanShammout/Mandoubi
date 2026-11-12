import { TransactionContext } from '@/common/base/transaction-context';
import { CreateInvoiceRepoInput } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { RequestedProductTotal } from '@/modules/invoice/helpers/rank-requested-products.helper';

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
  /** Loads the pharmacy that owns the invoice. */
  abstract findPharmacyId(id: number, context?: TransactionContext): Promise<number | null>;
  /** Sums paid quantity per product for one pharmacy, including rejected invoices. */
  abstract listRequestedTotals(pharmacyId: number): Promise<RequestedProductTotal[]>;
  /** Moves a pending invoice to approved. Returns false when it is not pending. */
  abstract markApproved(id: number, context: TransactionContext): Promise<boolean>;
  /** Moves a pending invoice to rejected. Returns false when it is not pending. */
  abstract markRejected(input: RejectInvoiceRepoInput, context: TransactionContext): Promise<boolean>;
  /** Moves an approved invoice to assigned. Returns false when it is not approved. */
  abstract markAssigned(id: number, context: TransactionContext): Promise<boolean>;
  /** Moves an assigned or redelivered invoice to a delivery result. Returns false when it is not open. */
  abstract markDelivered(id: number, status: InvoiceStatus, context: TransactionContext): Promise<boolean>;
  /** Moves a missed or unpaid delivery back to the warehouse. Returns false when the status does not match. */
  abstract markReturned(id: number, context: TransactionContext): Promise<boolean>;
  /** Sends a returned invoice out again. Returns false when it is not in the warehouse. */
  abstract markOutForDelivery(id: number, context: TransactionContext): Promise<boolean>;
}
