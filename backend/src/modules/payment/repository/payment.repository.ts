import { TransactionContext } from '@/common/base/transaction-context';
import { PayableInvoice } from '@/modules/payment/helpers/plan-receipt-allocations.helper';
import { CreatePaymentRepoInput } from '@/modules/payment/defs/payment-repository.defs';
import { PaymentEntity } from '@/modules/payment/entity/payment.entity';

/**
 * Persistence contract for receipts and driver collections.
 */
export abstract class PaymentRepository {
  /** Loads the money and pharmacy of the selected invoices. */
  abstract findPayableInvoices(invoiceIds: readonly number[]): Promise<PayableInvoice[]>;
  /** Inserts one payment and its whole-invoice allocations. */
  abstract create(input: CreatePaymentRepoInput, context?: TransactionContext): Promise<PaymentEntity>;
  /** Lists payments recorded for one pharmacy, oldest first. */
  abstract listByPharmacyId(pharmacyId: number): Promise<PaymentEntity[]>;
  /** Lists amounts a driver collected, oldest first. */
  abstract listDriverCollections(driverId: number): Promise<PaymentEntity[]>;
  /** Loads collections by id. */
  abstract findCollectionsByIds(paymentIds: readonly number[]): Promise<PaymentEntity[]>;
  /** Reports whether any payment already covers this invoice. */
  abstract hasAllocation(invoiceId: number, context?: TransactionContext): Promise<boolean>;
}
