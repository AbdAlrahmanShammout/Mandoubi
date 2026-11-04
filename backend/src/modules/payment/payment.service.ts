import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { invoiceTotals } from '@/modules/invoice/helpers/invoice-totals.helper';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { PaymentEntity } from '@/modules/payment/entity/payment.entity';
import { planReceiptAllocations } from '@/modules/payment/helpers/plan-receipt-allocations.helper';
import { PaymentRepository } from '@/modules/payment/repository/payment.repository';
import { PharmacyService } from '@/modules/pharmacy/pharmacy.service';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Receipt recorded by an administrator for whole invoices.
 */
interface RecordReceiptInput {
  readonly actorUserId: number;
  readonly pharmacyId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly paymentMethod: PaymentMethod;
  readonly invoiceIds: readonly number[];
}

/**
 * Amount the driver collected when an invoice was delivered and paid.
 */
interface RecordDriverCollectionInput {
  readonly actorUserId: number;
  readonly pharmacyId: number;
  readonly driverId: number;
  readonly driverName: string;
  readonly invoice: InvoiceEntity;
  readonly occurredAt: Date;
}

/**
 * Receipts that pay whole invoices, and collections the driver still holds.
 */
@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly pharmacyService: PharmacyService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Records a receipt that covers every selected invoice in full.
   */
  async recordReceipt(input: RecordReceiptInput): Promise<PaymentEntity> {
    await this.pharmacyService.getPharmacyById(input.pharmacyId);
    const invoices = await this.paymentRepository.findPayableInvoices(input.invoiceIds);
    const allocations = planReceiptAllocations({ ...input, invoices });
    return this.transactionRunner.run(async (context) => {
      const payment = await this.paymentRepository.create({
        pharmacyId: input.pharmacyId,
        kind: PaymentKind.RECEIPT,
        currency: input.currency,
        amount: input.amount,
        receivedByName: input.receivedByName,
        paymentMethod: input.paymentMethod,
        driverId: null,
        occurredAt: new Date(),
        allocations,
      }, context);
      await this.recordPayment(input.actorUserId, payment, context);
      await this.notificationService.notify({
        audience: NotificationAudience.PHARMACY,
        audienceId: input.pharmacyId,
        kind: NotificationKind.PAYMENT_RECORDED,
        title: 'Payment recorded',
        body: `A receipt of ${payment.amount} ${payment.currency} was recorded`,
        resourceType: 'payment',
        resourceId: payment.id,
      }, context);
      return payment;
    });
  }
  /**
   * Records the amount collected by the driver for one delivered invoice.
   */
  async recordDriverCollection(input: RecordDriverCollectionInput, context: TransactionContext): Promise<void> {
    const totals = invoiceTotals(input.invoice.items ?? []);
    for (const total of totals) {
      const payment = await this.paymentRepository.create({
        pharmacyId: input.pharmacyId,
        kind: PaymentKind.DRIVER_COLLECTION,
        currency: total.currency,
        amount: total.amount,
        receivedByName: input.driverName,
        paymentMethod: PaymentMethod.CASH,
        driverId: input.driverId,
        occurredAt: input.occurredAt,
        allocations: [{ invoiceId: input.invoice.id, amount: total.amount, currency: total.currency }],
      }, context);
      await this.recordPayment(input.actorUserId, payment, context);
      await this.notificationService.notify({
        audience: NotificationAudience.PHARMACY,
        audienceId: input.pharmacyId,
        kind: NotificationKind.PAYMENT_RECORDED,
        title: 'Payment recorded',
        body: `The driver collected ${payment.amount} ${payment.currency}`,
        resourceType: 'payment',
        resourceId: payment.id,
      }, context);
    }
  }
  /**
   * Reports whether the invoice is already covered by a receipt or a driver collection.
   */
  async hasAllocation(invoiceId: number, context?: TransactionContext): Promise<boolean> {
    return this.paymentRepository.hasAllocation(invoiceId, context);
  }
  private async recordPayment(actorUserId: number, payment: PaymentEntity, context: TransactionContext): Promise<void> {
    await this.auditService.record({
      actorUserId,
      action: AuditAction.PAYMENT_RECORDED,
      resourceType: 'payment',
      resourceId: String(payment.id),
      detail: { paymentId: payment.id, kind: payment.kind, currency: payment.currency, amount: payment.amount },
    }, context);
  }
  /**
   * Lists payments posted to one pharmacy.
   */
  async listByPharmacyId(pharmacyId: number): Promise<PaymentEntity[]> {
    return this.paymentRepository.listByPharmacyId(pharmacyId);
  }
  /**
   * Lists amounts one driver collected.
   */
  async listDriverCollections(driverId: number): Promise<PaymentEntity[]> {
    return this.paymentRepository.listDriverCollections(driverId);
  }
  /**
   * Loads the collections an administrator is handing over.
   */
  async getCollections(paymentIds: readonly number[]): Promise<PaymentEntity[]> {
    const payments = await this.paymentRepository.findCollectionsByIds(paymentIds);
    if (payments.length !== new Set(paymentIds).size) {
      throw new ResourceNotFoundException('Payment', paymentIds.join(','));
    }
    return payments;
  }
}
