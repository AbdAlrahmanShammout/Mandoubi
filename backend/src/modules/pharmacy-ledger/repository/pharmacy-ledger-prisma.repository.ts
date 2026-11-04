import { Injectable } from '@nestjs/common';
import { DeliveryResult, InvoiceStatus as StoredInvoiceStatus, Prisma } from '@prisma/client';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { invoiceTotals } from '@/modules/invoice/helpers/invoice-totals.helper';
import { InvoiceItemEntity } from '@/modules/invoice/entity/invoice-item.entity';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { StatementCharge, StatementCredit } from '@/modules/pharmacy-ledger/helpers/build-pharmacy-statement.helper';
import { PharmacyLedgerRepository } from '@/modules/pharmacy-ledger/repository/pharmacy-ledger.repository';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { formatMoney } from '@/modules/product/helpers/syp-price.helper';

const DELIVERED_INVOICE_STATUSES = [StoredInvoiceStatus.DELIVERED_PAID, StoredInvoiceStatus.DELIVERED_UNPAID] as const;
const DELIVERED_EVENT_RESULTS = [DeliveryResult.DELIVERED_PAID, DeliveryResult.DELIVERED_UNPAID] as const;

/**
 * Prisma read model for pharmacy statements.
 */
@Injectable()
export class PharmacyLedgerPrismaRepository extends PharmacyLedgerRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Loads one charge per currency for each delivered invoice. */
  async listCharges(pharmacyId: number): Promise<StatementCharge[]> {
    const invoices = await this.prisma.invoice.findMany({
      where: { order: { pharmacyId }, status: { in: [...DELIVERED_INVOICE_STATUSES] } },
      include: { items: true },
      orderBy: { id: 'asc' },
    });
    const events = await this.prisma.deliveryEvent.findMany({
      where: { invoiceId: { in: invoices.map((invoice) => invoice.id) }, result: { in: [...DELIVERED_EVENT_RESULTS] } },
      orderBy: { occurredAt: 'asc' },
    });
    return invoices.flatMap((invoice) => {
      const deliveredAt = events.find((event) => event.invoiceId === invoice.id)?.occurredAt ?? invoice.updatedAt;
      return invoiceTotals(invoice.items.map((item) => toItem(item))).map((total) => ({
        invoiceId: invoice.id,
        orderId: invoice.orderId,
        status: invoice.status as InvoiceStatus,
        currency: total.currency,
        amount: total.amount,
        deliveredAt,
      }));
    });
  }
  /** Loads payments and the invoices they cover. */
  async listCredits(pharmacyId: number): Promise<StatementCredit[]> {
    const payments = await this.prisma.payment.findMany({ where: { pharmacyId }, include: { allocations: true }, orderBy: { occurredAt: 'asc' } });
    return payments.map((payment) => ({
      paymentId: payment.id,
      kind: payment.kind as PaymentKind,
      currency: payment.currency as InvoiceCurrency,
      amount: formatMoney(payment.amount),
      occurredAt: payment.occurredAt,
      invoiceIds: payment.allocations.map((allocation) => allocation.invoiceId),
    }));
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
