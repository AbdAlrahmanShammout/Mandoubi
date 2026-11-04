import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceService } from '@/modules/invoice/invoice.service';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { PaymentService } from '@/modules/payment/payment.service';
import { ProductService } from '@/modules/product/product.service';
import { planReturnStock } from '@/modules/return-record/helpers/plan-return-stock.helper';
import { ReturnRecordRepository } from '@/modules/return-record/repository/return-record.repository';

/**
 * Returns an invoice to the warehouse stored on its lines, once.
 */
@Injectable()
export class ReturnRecordService {
  constructor(
    private readonly returnRecordRepository: ReturnRecordRepository,
    private readonly invoiceService: InvoiceService,
    private readonly productService: ProductService,
    private readonly paymentService: PaymentService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Moves a missed or unpaid delivery back to the warehouse and changes stock once.
   */
  async returnToWarehouse(invoiceId: number, actorUserId: number): Promise<InvoiceEntity> {
    return this.transactionRunner.run(async (context) => {
      const invoice = await this.invoiceService.getInvoiceInTransaction(invoiceId, context);
      const effect = planReturnStock(invoice.status);
      if (await this.paymentService.hasAllocation(invoiceId, context)) {
        throw new InvalidStateException({ message: 'A paid invoice cannot return to the warehouse', code: 'RETURN_NOT_ALLOWED' });
      }
      const returned = await this.invoiceService.markReturned(invoiceId, context);
      await this.applyStock(requireItems(returned), effect, context);
      await this.returnRecordRepository.create(invoiceId, context);
      await this.auditService.record({
        actorUserId,
        action: AuditAction.INVOICE_STATUS_CHANGED,
        resourceType: 'invoice',
        resourceId: String(invoiceId),
        detail: { from: invoice.status, to: InvoiceStatus.RETURNED_TO_WAREHOUSE },
      }, context);
      const pharmacyId = await this.invoiceService.findPharmacyId(invoiceId, context);
      await this.notify(invoiceId, pharmacyId, context);
      return returned;
    });
  }
  private async applyStock(items: readonly InvoiceItemEntity[], effect: 'release' | 'restock', context: TransactionContext): Promise<void> {
    for (const item of items) {
      const input = { productId: item.productId, warehouseId: item.primaryWarehouseId, quantity: item.totalQuantity };
      if (effect === 'release') {
        await this.productService.releaseRecordedStock(input, context);
        continue;
      }
      await this.productService.restockRecordedStock(input, context);
    }
  }
  private async notify(invoiceId: number, pharmacyId: number, context: TransactionContext): Promise<void> {
    const message = { title: 'Invoice returned', body: `Invoice ${invoiceId} returned to the warehouse`, resourceType: 'invoice', resourceId: invoiceId };
    await this.notificationService.notify({ ...message, audience: NotificationAudience.ADMIN, audienceId: null, kind: NotificationKind.DELIVERY_UPDATED }, context);
    await this.notificationService.notify({ ...message, audience: NotificationAudience.PHARMACY, audienceId: pharmacyId, kind: NotificationKind.DELIVERY_UPDATED }, context);
  }
}

function requireItems(invoice: InvoiceEntity): readonly InvoiceItemEntity[] {
  if (!invoice.items) {
    throw new InvalidStateException({ message: 'The invoice lines were not loaded', code: 'INVOICE_LINES_MISSING' });
  }
  return invoice.items;
}
