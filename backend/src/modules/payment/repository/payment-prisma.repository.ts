import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreatePaymentRepoInput } from '@/modules/payment/defs/payment-repository.defs';
import { PaymentEntity } from '@/modules/payment/entity/payment.entity';
import { PayableInvoice } from '@/modules/payment/helpers/plan-receipt-allocations.helper';
import { PaymentMapper } from '@/modules/payment/mapper/payment.mapper';
import { PaymentRepository } from '@/modules/payment/repository/payment.repository';
import { paymentDetailsInclude } from '@/modules/payment/types/payment-details.include';
import { invoiceTotals } from '@/modules/invoice/helpers/invoice-totals.helper';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { formatMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Prisma storage for receipts and driver collections.
 */
@Injectable()
export class PaymentPrismaRepository extends PaymentRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Loads invoice totals for the receipt check. */
  async findPayableInvoices(invoiceIds: readonly number[]): Promise<PayableInvoice[]> {
    const results = await this.prisma.invoice.findMany({ where: { id: { in: [...invoiceIds] } }, include: { items: true, order: true } });
    return results.map((result) => ({
      id: result.id,
      orderId: result.orderId,
      pharmacyId: result.order.pharmacyId,
      status: result.status as InvoiceStatus,
      totals: invoiceTotals(result.items.map((item) => toItem(item))),
    }));
  }
  /** Inserts one payment on the given transaction when one is open. */
  async create(input: CreatePaymentRepoInput, context?: TransactionContext): Promise<PaymentEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.payment.create({
        data: {
          pharmacyId: input.pharmacyId,
          kind: input.kind,
          currency: input.currency,
          amount: input.amount,
          receivedByName: input.receivedByName,
          paymentMethod: input.paymentMethod,
          driverId: input.driverId,
          occurredAt: input.occurredAt,
          allocations: { create: input.allocations.map((allocation) => ({ invoiceId: allocation.invoiceId, amount: allocation.amount, currency: allocation.currency })) },
        },
        include: paymentDetailsInclude,
      });
      return PaymentMapper.toEntity(result);
    } catch (error) {
      rethrowConflict(error, alreadyPaid());
    }
  }
  /** Lists payments for one pharmacy, oldest first. */
  async listByPharmacyId(pharmacyId: number): Promise<PaymentEntity[]> {
    const results = await this.prisma.payment.findMany({ where: { pharmacyId }, include: paymentDetailsInclude, orderBy: { occurredAt: 'asc' } });
    return results.map((result) => PaymentMapper.toEntity(result));
  }
  /** Lists amounts one driver collected, oldest first. */
  async listDriverCollections(driverId: number): Promise<PaymentEntity[]> {
    const results = await this.prisma.payment.findMany({ where: { driverId, kind: 'DRIVER_COLLECTION' }, include: paymentDetailsInclude, orderBy: { occurredAt: 'asc' } });
    return results.map((result) => PaymentMapper.toEntity(result));
  }
  /** Loads collections by id. */
  async findCollectionsByIds(paymentIds: readonly number[]): Promise<PaymentEntity[]> {
    const results = await this.prisma.payment.findMany({ where: { id: { in: [...paymentIds] }, kind: 'DRIVER_COLLECTION' }, include: paymentDetailsInclude });
    return results.map((result) => PaymentMapper.toEntity(result));
  }
}

function toItem(item: Prisma.InvoiceItemGetPayload<object>): InvoiceItemEntity {
  return new InvoiceItemEntity({
    id: item.id,
    invoiceId: item.invoiceId,
    productId: item.productId,
    productName: item.productName,
    barcode: item.barcode,
    saleUnit: item.saleUnit as SaleUnit,
    paidQuantity: item.paidQuantity,
    freeQuantity: item.freeQuantity,
    totalQuantity: item.totalQuantity,
    unitPrice: formatMoney(item.unitPrice),
    consumerUnitPrice: formatMoney(item.consumerUnitPrice),
    currency: item.currency as InvoiceCurrency,
    lineAmount: formatMoney(item.lineAmount),
    primaryWarehouseId: item.primaryWarehouseId,
    offerPaidUnits: item.offerPaidUnits,
    offerFreeUnits: item.offerFreeUnits,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    deletedAt: null,
  });
}

function alreadyPaid(): ConflictException {
  return new ConflictException({ message: 'This invoice is already paid in this currency', code: 'INVOICE_ALREADY_PAID' });
}
