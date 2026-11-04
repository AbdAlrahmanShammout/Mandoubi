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
  async approveInvoice(id: number): Promise<InvoiceEntity> {
    return this.transactionRunner.run(async (context) => {
      const approved = await this.invoiceRepository.markApproved(id, context);
      const invoice = await this.requireInvoice(id, context);
      if (!approved) {
        throw new InvalidStateException({ message: 'Only a pending invoice can be approved', code: 'INVOICE_NOT_PENDING' });
      }
      await this.reserveItems(requireItems(invoice), context);
      return invoice;
    });
  }
  /**
   * Rejects one pending invoice. Stock is left unchanged.
   */
  async rejectInvoice(id: number, input: RejectInvoiceInput): Promise<InvoiceEntity> {
    const rejectionReasonId = await this.readReasonId(input.rejectionReasonId);
    const customReason = readCustomReason(input.customReason);
    return this.transactionRunner.run(async (context) => {
      const rejected = await this.invoiceRepository.markRejected({ id, rejectionReasonId, customReason }, context);
      if (!rejected) {
        await this.requireInvoice(id, context);
        throw new InvalidStateException({ message: 'Only a pending invoice can be rejected', code: 'INVOICE_NOT_PENDING' });
      }
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
