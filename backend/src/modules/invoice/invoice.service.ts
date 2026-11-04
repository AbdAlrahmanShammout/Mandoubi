import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { CreateInvoiceRepoInput } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceRepository } from '@/modules/invoice/repository/invoice.repository';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { ProductService } from '@/modules/product/product.service';
import { RejectionReasonService } from '@/modules/rejection-reason/rejection-reason.service';

/**
 * Optional reasons supplied when an invoice is rejected.
 */
interface RejectInvoiceInput {
  readonly rejectionReasonId?: number;
  readonly customReason?: string;
}

/**
 * Category invoices created from an order, then approved or rejected one at a time.
 */
@Injectable()
export class InvoiceService {
  constructor(
    private readonly invoiceRepository: InvoiceRepository,
    private readonly productService: ProductService,
    private readonly rejectionReasonService: RejectionReasonService,
    private readonly auditService: AuditService,
    private readonly notificationService: NotificationService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Stores one category invoice and the prices captured at submission.
   */
  async createInvoice(input: CreateInvoiceRepoInput, context?: TransactionContext): Promise<InvoiceEntity> {
    return this.invoiceRepository.create(input, context);
  }
  /**
   * Loads one invoice and its snapshotted lines.
   */
  async getInvoiceById(id: number): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findById(id);
    if (!invoice) {
      throw new ResourceNotFoundException('Invoice', id);
    }
    return invoice;
  }
  /**
   * Approves one pending invoice and reserves its quantity from the recorded warehouses.
   */
  async approveInvoice(id: number, actorUserId: number): Promise<InvoiceEntity> {
    return this.transactionRunner.run(async (context) => {
      const approved = await this.invoiceRepository.markApproved(id, context);
      const invoice = await this.requireInvoice(id, context);
      if (!approved) {
        throw new InvalidStateException({ message: 'Only a pending invoice can be approved', code: 'INVOICE_NOT_PENDING' });
      }
      await this.reserveItems(requireItems(invoice), context);
      await this.recordStatus(actorUserId, id, InvoiceStatus.PENDING, InvoiceStatus.APPROVED, context);
      await this.notifyPharmacy(id, NotificationKind.INVOICE_APPROVED, 'Invoice approved', `Invoice ${id} was approved`, context);
      return invoice;
    });
  }
  /**
   * Rejects one pending invoice. Stock is left unchanged.
   */
  async rejectInvoice(id: number, input: RejectInvoiceInput, actorUserId: number): Promise<InvoiceEntity> {
    const rejectionReasonId = await this.readReasonId(input.rejectionReasonId);
    const customReason = readCustomReason(input.customReason);
    return this.transactionRunner.run(async (context) => {
      const rejected = await this.invoiceRepository.markRejected({ id, rejectionReasonId, customReason }, context);
      if (!rejected) {
        await this.requireInvoice(id, context);
        throw new InvalidStateException({ message: 'Only a pending invoice can be rejected', code: 'INVOICE_NOT_PENDING' });
      }
      await this.recordStatus(actorUserId, id, InvoiceStatus.PENDING, InvoiceStatus.REJECTED, context);
      await this.notifyPharmacy(id, NotificationKind.INVOICE_REJECTED, 'Invoice rejected', `Invoice ${id} was rejected`, context);
      return this.requireInvoice(id, context);
    });
  }
  /**
   * Moves an approved invoice to assigned inside the caller's transaction.
   */
  async markAssigned(id: number, context: TransactionContext): Promise<void> {
    const assigned = await this.invoiceRepository.markAssigned(id, context);
    if (!assigned) {
      await this.requireInvoice(id, context);
      throw new InvalidStateException({ message: 'Only an approved invoice can be assigned', code: 'INVOICE_NOT_APPROVED' });
    }
  }
  /**
   * Moves an assigned invoice to the recorded delivery result and returns its lines.
   */
  async markDelivered(id: number, status: InvoiceStatus, context: TransactionContext): Promise<InvoiceEntity> {
    const delivered = await this.invoiceRepository.markDelivered(id, status, context);
    const invoice = await this.requireInvoice(id, context);
    if (!delivered) {
      throw new InvalidStateException({ message: 'Only an assigned invoice can record a delivery result', code: 'INVOICE_NOT_ASSIGNED' });
    }
    return invoice;
  }
  /**
   * Loads an invoice inside an already open transaction.
   */
  async getInvoiceInTransaction(id: number, context: TransactionContext): Promise<InvoiceEntity> {
    return this.requireInvoice(id, context);
  }
  /**
   * Loads the pharmacy that owns the invoice.
   */
  async findPharmacyId(id: number, context?: TransactionContext): Promise<number> {
    const pharmacyId = await this.invoiceRepository.findPharmacyId(id, context);
    if (pharmacyId === null) {
      throw new ResourceNotFoundException('Invoice', id);
    }
    return pharmacyId;
  }
  /**
   * Moves a missed or unpaid delivery to returned and returns the invoice.
   */
  async markReturned(id: number, context: TransactionContext): Promise<InvoiceEntity> {
    const returned = await this.invoiceRepository.markReturned(id, context);
    const invoice = await this.requireInvoice(id, context);
    if (!returned) {
      throw new InvalidStateException({ message: 'Only an unpaid or undelivered invoice can return to the warehouse', code: 'RETURN_NOT_ALLOWED' });
    }
    return invoice;
  }
  /**
   * Sends a returned invoice out for delivery again.
   */
  async markOutForDelivery(id: number, context: TransactionContext): Promise<InvoiceEntity> {
    const sent = await this.invoiceRepository.markOutForDelivery(id, context);
    const invoice = await this.requireInvoice(id, context);
    if (!sent) {
      throw new InvalidStateException({ message: 'Only an invoice in the warehouse can be sent out again', code: 'INVOICE_NOT_RETURNED' });
    }
    return invoice;
  }
  private async recordStatus(actorUserId: number, invoiceId: number, from: InvoiceStatus, to: InvoiceStatus, context: TransactionContext): Promise<void> {
    await this.auditService.record({
      actorUserId,
      action: AuditAction.INVOICE_STATUS_CHANGED,
      resourceType: 'invoice',
      resourceId: String(invoiceId),
      detail: { from, to },
    }, context);
  }
  private async notifyPharmacy(invoiceId: number, kind: NotificationKind, title: string, body: string, context: TransactionContext): Promise<void> {
    const pharmacyId = await this.findPharmacyId(invoiceId, context);
    await this.notificationService.notify({
      audience: NotificationAudience.PHARMACY,
      audienceId: pharmacyId,
      kind,
      title,
      body,
      resourceType: 'invoice',
      resourceId: invoiceId,
    }, context);
  }
  private async readReasonId(rejectionReasonId?: number): Promise<number | null> {
    if (rejectionReasonId === undefined) {
      return null;
    }
    const reason = await this.rejectionReasonService.requireActive(rejectionReasonId);
    return reason.id;
  }
  private async requireInvoice(id: number, context: TransactionContext): Promise<InvoiceEntity> {
    const invoice = await this.invoiceRepository.findById(id, context);
    if (!invoice) {
      throw new ResourceNotFoundException('Invoice', id);
    }
    return invoice;
  }
  private async reserveItems(items: readonly InvoiceItemEntity[], context: TransactionContext): Promise<void> {
    for (const item of items) {
      await this.productService.reserveRecordedStock({ productId: item.productId, warehouseId: item.primaryWarehouseId, quantity: item.totalQuantity }, context);
    }
  }
}

function requireItems(invoice: InvoiceEntity): InvoiceItemEntity[] {
  if (!invoice.items) {
    throw new InvalidStateException({ message: 'The invoice lines were not loaded', code: 'INVOICE_LINES_MISSING' });
  }
  return invoice.items;
}

function readCustomReason(customReason?: string): string | null {
  if (customReason === undefined || customReason.length === 0) {
    return null;
  }
  return customReason;
}
