import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { CreateInvoiceRepoInput } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceRepository } from '@/modules/invoice/repository/invoice.repository';

/**
 * Category invoices created from an order and read for review.
 */
@Injectable()
export class InvoiceService {
  constructor(private readonly invoiceRepository: InvoiceRepository) {}
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
}
