import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
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
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Records a receipt that covers every selected invoice in full.
   */
  async recordReceipt(input: RecordReceiptInput): Promise<PaymentEntity> {
    await this.pharmacyService.getPharmacyById(input.pharmacyId);
    const invoices = await this.paymentRepository.findPayableInvoices(input.invoiceIds);
    const allocations = planReceiptAllocations({ ...input, invoices });
    return this.transactionRunner.run(async (context) => this.paymentRepository.create({
      pharmacyId: input.pharmacyId,
      kind: PaymentKind.RECEIPT,
      currency: input.currency,
      amount: input.amount,
      receivedByName: input.receivedByName,
      paymentMethod: input.paymentMethod,
      driverId: null,
      occurredAt: new Date(),
      allocations,
    }, context));
  }
  /**
   * Records the amount collected by the driver for one delivered invoice.
   */
  async recordDriverCollection(input: RecordDriverCollectionInput, context: TransactionContext): Promise<void> {
    const totals = invoiceTotals(input.invoice.items ?? []);
    for (const total of totals) {
      await this.paymentRepository.create({
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
    }
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
