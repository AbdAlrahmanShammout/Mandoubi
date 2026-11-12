import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateInvoiceRepoInput, PreparedInvoiceItem } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceEntity } from '@/modules/invoice/entity/invoice.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceMapper } from '@/modules/invoice/mapper/invoice.mapper';
import { InvoiceRepository, RejectInvoiceRepoInput } from '@/modules/invoice/repository/invoice.repository';
import { RequestedProductTotal } from '@/modules/invoice/helpers/rank-requested-products.helper';
import { invoiceDetailsInclude } from '@/modules/invoice/types/invoice-details.include';

/**
 * Prisma storage for category invoices and their snapshotted lines.
 */
@Injectable()
export class InvoicePrismaRepository extends InvoiceRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one invoice and its lines on the given transaction when one is open. */
  async create(input: CreateInvoiceRepoInput, context?: TransactionContext): Promise<InvoiceEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.invoice.create({
      data: {
        orderId: input.orderId,
        category: input.category,
        items: { create: input.items.map((item) => itemColumns(item)) },
      },
      include: invoiceDetailsInclude,
    });
    return InvoiceMapper.toEntity(result);
  }
  /** Loads one invoice and its lines on the given transaction when one is open. */
  async findById(id: number, context?: TransactionContext): Promise<InvoiceEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.invoice.findUnique({ where: { id }, include: invoiceDetailsInclude });
    return result ? InvoiceMapper.toEntity(result) : null;
  }
  /** Loads the pharmacy that submitted the parent order. */
  async findPharmacyId(id: number, context?: TransactionContext): Promise<number | null> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.invoice.findUnique({ where: { id }, select: { order: { select: { pharmacyId: true } } } });
    return result?.order.pharmacyId ?? null;
  }
  /** Sums paid quantity per product across every invoice this pharmacy submitted. */
  async listRequestedTotals(pharmacyId: number): Promise<RequestedProductTotal[]> {
    const rows = await this.prisma.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { order: { pharmacyId } } },
      _sum: { paidQuantity: true },
    });
    return rows.map((row) => ({ productId: row.productId, requestedQuantity: row._sum.paidQuantity ?? 0 }));
  }
  /** Approves a pending invoice without changing stock itself. */
  async markApproved(id: number, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.invoice.updateMany({ where: { id, status: 'PENDING' }, data: { status: 'APPROVED' } });
    return updated.count === 1;
  }
  /** Rejects a pending invoice and stores the optional reasons. */
  async markRejected(input: RejectInvoiceRepoInput, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.invoice.updateMany({
      where: { id: input.id, status: 'PENDING' },
      data: { status: 'REJECTED', rejectionReasonId: input.rejectionReasonId, customReason: input.customReason },
    });
    return updated.count === 1;
  }
  /** Assigns an approved invoice without choosing the driver. */
  async markAssigned(id: number, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.invoice.updateMany({ where: { id, status: 'APPROVED' }, data: { status: 'ASSIGNED' } });
    return updated.count === 1;
  }
  /** Records a delivery result on an assigned or redelivered invoice. */
  async markDelivered(id: number, status: InvoiceStatus, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.invoice.updateMany({ where: { id, status: { in: ['ASSIGNED', 'OUT_FOR_DELIVERY'] } }, data: { status } });
    return updated.count === 1;
  }
  /** Returns a missed or unpaid invoice to the warehouse. */
  async markReturned(id: number, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.invoice.updateMany({ where: { id, status: { in: ['NOT_DELIVERED', 'DELIVERED_UNPAID'] } }, data: { status: 'RETURNED_TO_WAREHOUSE' } });
    return updated.count === 1;
  }
  /** Sends a returned invoice out for delivery again. */
  async markOutForDelivery(id: number, context: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.invoice.updateMany({ where: { id, status: 'RETURNED_TO_WAREHOUSE' }, data: { status: 'OUT_FOR_DELIVERY' } });
    return updated.count === 1;
  }
}

function itemColumns(item: PreparedInvoiceItem): Prisma.InvoiceItemUncheckedCreateWithoutInvoiceInput {
  return {
    productId: item.productId,
    productName: item.productName,
    barcode: item.barcode,
    saleUnit: item.saleUnit,
    paidQuantity: item.paidQuantity,
    freeQuantity: item.freeQuantity,
    totalQuantity: item.totalQuantity,
    unitPrice: item.unitPrice,
    consumerUnitPrice: item.consumerUnitPrice,
    currency: item.currency,
    lineAmount: item.lineAmount,
    primaryWarehouseId: item.primaryWarehouseId,
    offerPaidUnits: item.offerPaidUnits,
    offerFreeUnits: item.offerFreeUnits,
  };
}
