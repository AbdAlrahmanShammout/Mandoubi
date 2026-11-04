import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { formatMoney, subtractMoney, sumMoney } from '@/modules/product/helpers/syp-price.helper';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ReportRepository } from '@/modules/report/repository/report.repository';
import { CurrencyTotal, DebtInvoice, DebtReport, DriverHolding, DriverReportRow, PharmacyBalance, ProductReport, ReportPeriod, SalesReport, SalesReportQuery, SellerTotal, WarehouseQuantity } from '@/modules/report/report.types';

const DELIVERED = [InvoiceStatus.DELIVERED_PAID, InvoiceStatus.DELIVERED_UNPAID] as const;
const SELLER_LIMIT = 10;

/**
 * Prisma read model for sales, stock, debt, and driver reports.
 */
@Injectable()
export class ReportPrismaRepository extends ReportRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Sums delivered lines whose delivery event falls in the period. */
  async sales(query: SalesReportQuery): Promise<SalesReport> {
    const items = await this.prisma.invoiceItem.findMany({ where: deliveredWhere(query), select: { currency: true, lineAmount: true } });
    return { totals: groupAmounts(items.map((item) => ({ currency: item.currency, amount: item.lineAmount }))) };
  }
  /** Ranks paid quantities and lists the current stock in every warehouse. */
  async products(period: ReportPeriod): Promise<ProductReport> {
    const items = await this.prisma.invoiceItem.findMany({
      where: deliveredWhere(period),
      select: { productId: true, productName: true, currency: true, paidQuantity: true },
    });
    const sellers = rankSellers(items);
    const stocks = await this.listWarehouseQuantities();
    return {
      bestSellers: sellers.slice(0, SELLER_LIMIT),
      slowestSellers: [...sellers].reverse().slice(0, SELLER_LIMIT),
      lowQuantity: stocks.filter((stock) => stock.availableQuantity > 0 && stock.availableQuantity <= stock.lowQuantityThreshold),
      unavailable: stocks.filter((stock) => stock.availableQuantity === 0),
      quantitiesByWarehouse: stocks,
    };
  }
  /** Builds balances from every delivered invoice and limits the payment list to the period. */
  async debts(period: ReportPeriod, now: Date): Promise<DebtReport> {
    const invoices = await this.prisma.invoice.findMany({
      where: { status: { in: [...DELIVERED] } },
      include: { items: true, allocations: true, order: { include: { pharmacy: true } }, assignment: { include: { events: { orderBy: { occurredAt: 'asc' } } } } },
    });
    const payments = await this.prisma.payment.findMany();
    const balances = buildBalances(invoices, payments);
    const unpaidInvoices = buildUnpaid(invoices, now);
    const periodPayments = payments.filter((payment) => payment.occurredAt >= period.from && payment.occurredAt <= period.to);
    return {
      balances,
      unpaidInvoices,
      paymentsInPeriod: groupAmounts(periodPayments.map((payment) => ({ currency: payment.currency, amount: payment.amount }))),
      totalDue: groupCurrencyTotals(balances.map((balance) => ({ currency: balance.currency, amount: balance.outstanding }))),
    };
  }
  /** Counts assignments and compares collected money with handovers. */
  async drivers(): Promise<DriverReportRow[]> {
    const drivers = await this.prisma.driver.findMany({
      where: { deletedAt: null },
      include: { assignments: { include: { invoice: true } }, payments: true, settlements: true },
      orderBy: { id: 'asc' },
    });
    return drivers.map((driver) => toDriverRow(driver));
  }
  private async listWarehouseQuantities(): Promise<WarehouseQuantity[]> {
    const stocks = await this.prisma.productStock.findMany({
      where: { product: { deletedAt: null } },
      include: { product: true, warehouse: true },
      orderBy: [{ warehouseId: 'asc' }, { productId: 'asc' }],
    });
    return stocks.map((stock) => ({
      warehouseId: stock.warehouseId,
      warehouseName: stock.warehouse.name,
      productId: stock.productId,
      productName: stock.product.name,
      quantity: stock.quantity,
      reservedQuantity: stock.reservedQuantity,
      availableQuantity: stock.quantity - stock.reservedQuantity,
      lowQuantityThreshold: stock.product.lowQuantityThreshold,
    }));
  }
}

function deliveredWhere(query: SalesReportQuery): Prisma.InvoiceItemWhereInput {
  return {
    invoice: {
      status: { in: [...DELIVERED] },
      ...(query.category ? { category: query.category } : {}),
      ...(query.pharmacyId ? { order: { pharmacyId: query.pharmacyId } } : {}),
      assignment: { events: { some: { result: { in: [...DELIVERED] }, occurredAt: { gte: query.from, lte: query.to } } } },
    },
  };
}

function groupAmounts(rows: readonly { currency: string; amount: Prisma.Decimal }[]): CurrencyTotal[] {
  const totals = new Map<string, Prisma.Decimal>();
  rows.forEach((row) => totals.set(row.currency, (totals.get(row.currency) ?? new Prisma.Decimal(0)).add(row.amount)));
  return [...totals.entries()].map(([currency, amount]) => ({ currency: currency as InvoiceCurrency, amount: formatMoney(amount) }));
}

function groupCurrencyTotals(rows: readonly { currency: InvoiceCurrency; amount: string }[]): CurrencyTotal[] {
  const currencies = [...new Set(rows.map((row) => row.currency))];
  return currencies.map((currency) => ({ currency, amount: sumMoney(rows.filter((row) => row.currency === currency).map((row) => row.amount)) }));
}

function rankSellers(items: readonly { productId: number; productName: string; currency: string; paidQuantity: number }[]): SellerTotal[] {
  const totals = new Map<string, SellerTotal>();
  items.forEach((item) => {
    const key = `${item.productId}:${item.currency}`;
    const current = totals.get(key) ?? { productId: item.productId, productName: item.productName, currency: item.currency as InvoiceCurrency, paidQuantity: 0 };
    totals.set(key, { ...current, paidQuantity: current.paidQuantity + item.paidQuantity });
  });
  return [...totals.values()].filter((seller) => seller.paidQuantity > 0).sort((left, right) => right.paidQuantity - left.paidQuantity);
}

function buildBalances(invoices: readonly DeliveredInvoice[], payments: readonly { pharmacyId: number; currency: string; amount: Prisma.Decimal }[]): PharmacyBalance[] {
  const charges = groupLabeled(invoices.flatMap((invoice) => invoice.items.map((item) => ({
    pharmacyId: invoice.order.pharmacyId,
    pharmacyName: invoice.order.pharmacy.name,
    currency: item.currency,
    amount: item.lineAmount,
  }))));
  const credits = groupLabeled(payments.map((payment) => ({ pharmacyId: payment.pharmacyId, pharmacyName: '', currency: payment.currency, amount: payment.amount })));
  const keys = new Set([...charges.keys(), ...credits.keys()]);
  return [...keys].map((key) => toBalance(key, charges.get(key), credits.get(key))).filter((balance) => balance.outstanding !== '0.00');
}

function buildUnpaid(invoices: readonly DeliveredInvoice[], now: Date): DebtInvoice[] {
  return invoices.filter((invoice) => invoice.status === InvoiceStatus.DELIVERED_UNPAID).flatMap((invoice) => {
    const deliveredAt = invoice.assignment?.events.find((event) => event.result === 'DELIVERED_PAID' || event.result === 'DELIVERED_UNPAID')?.occurredAt ?? invoice.updatedAt;
    return groupAmounts(invoice.items.map((item) => ({ currency: item.currency, amount: item.lineAmount })))
      .filter((total) => !invoice.allocations.some((allocation) => allocation.currency === total.currency))
      .map((total) => ({
        invoiceId: invoice.id,
        pharmacyId: invoice.order.pharmacyId,
        pharmacyName: invoice.order.pharmacy.name,
        currency: total.currency,
        amount: total.amount,
        dueDate: deliveredAt,
        overdue: deliveredAt < now,
      }));
  });
}

function groupLabeled(rows: readonly { pharmacyId: number; pharmacyName: string; currency: string; amount: Prisma.Decimal }[]): Map<string, { pharmacyId: number; pharmacyName: string; currency: InvoiceCurrency; amount: string }> {
  const totals = new Map<string, { pharmacyId: number; pharmacyName: string; currency: string; amount: Prisma.Decimal }>();
  rows.forEach((row) => {
    const key = `${row.pharmacyId}:${row.currency}`;
    const current = totals.get(key);
    totals.set(key, {
      pharmacyId: row.pharmacyId,
      pharmacyName: row.pharmacyName || current?.pharmacyName || '',
      currency: row.currency,
      amount: (current?.amount ?? new Prisma.Decimal(0)).add(row.amount),
    });
  });
  return new Map([...totals.entries()].map(([key, value]) => [key, { ...value, currency: value.currency as InvoiceCurrency, amount: formatMoney(value.amount) }]));
}

function toBalance(key: string, charge: { pharmacyId: number; pharmacyName: string; currency: InvoiceCurrency; amount: string } | undefined, credit: { pharmacyId: number; pharmacyName: string; currency: InvoiceCurrency; amount: string } | undefined): PharmacyBalance {
  const source = charge ?? credit;
  const [pharmacyId, currency] = key.split(':');
  return {
    pharmacyId: source?.pharmacyId ?? Number(pharmacyId),
    pharmacyName: charge?.pharmacyName || credit?.pharmacyName || '',
    currency: (source?.currency ?? currency) as InvoiceCurrency,
    outstanding: subtractMoney(charge?.amount ?? '0.00', credit?.amount ?? '0.00'),
  };
}

function toDriverRow(driver: DriverRow): DriverReportRow {
  const statuses = driver.assignments.map((assignment) => assignment.invoice.status);
  const collections = driver.payments.filter((payment) => payment.kind === 'DRIVER_COLLECTION');
  const currencies = [...new Set([...collections.map((payment) => payment.currency), ...driver.settlements.map((settlement) => settlement.currency)])];
  return {
    driverId: driver.id,
    driverName: driver.name,
    assignedCount: driver.assignments.length,
    deliveredPaidCount: statuses.filter((status) => status === InvoiceStatus.DELIVERED_PAID).length,
    deliveredUnpaidCount: statuses.filter((status) => status === InvoiceStatus.DELIVERED_UNPAID).length,
    notDeliveredCount: statuses.filter((status) => status === InvoiceStatus.NOT_DELIVERED).length,
    holdings: currencies.map((currency) => toHolding(currency as InvoiceCurrency, collections, driver.settlements)),
  };
}

function toHolding(currency: InvoiceCurrency, collections: readonly { currency: string; amount: Prisma.Decimal }[], settlements: readonly { currency: string; amount: Prisma.Decimal }[]): DriverHolding {
  const collected = formatMoney(collections.filter((payment) => payment.currency === currency).reduce((total, payment) => total.add(payment.amount), new Prisma.Decimal(0)));
  const handedOver = formatMoney(settlements.filter((settlement) => settlement.currency === currency).reduce((total, settlement) => total.add(settlement.amount), new Prisma.Decimal(0)));
  return { currency, collected, handedOver, held: subtractMoney(collected, handedOver) };
}

interface DeliveredInvoice {
  id: number;
  status: string;
  updatedAt: Date;
  items: { currency: string; lineAmount: Prisma.Decimal }[];
  allocations: { currency: string }[];
  order: { pharmacyId: number; pharmacy: { name: string } };
  assignment: { events: { result: string; occurredAt: Date }[] } | null;
}

interface DriverRow {
  id: number;
  name: string;
  assignments: { invoice: { status: string } }[];
  payments: { kind: string; currency: string; amount: Prisma.Decimal }[];
  settlements: { currency: string; amount: Prisma.Decimal }[];
}
