import { ApiProperty } from '@nestjs/swagger';
import { CurrencyStatement, StatementEntry, UnpaidInvoice } from '@/modules/pharmacy-ledger/helpers/build-pharmacy-statement.helper';
import { PharmacyStatement } from '@/modules/pharmacy-ledger/pharmacy-ledger.service';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * One statement line.
 */
export class StatementEntryResponse {
  @ApiProperty({ example: 'CHARGE' })
  readonly kind: StatementEntry['kind'];
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '60000.00' })
  readonly amount: string;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly occurredAt: Date;
  @ApiProperty({ example: 1, nullable: true })
  readonly invoiceId: number | null;
  @ApiProperty({ example: 1, nullable: true })
  readonly paymentId: number | null;
  constructor(entry: StatementEntry) {
    this.kind = entry.kind;
    this.currency = entry.currency;
    this.amount = entry.amount;
    this.occurredAt = entry.occurredAt;
    this.invoiceId = entry.invoiceId;
    this.paymentId = entry.paymentId;
  }
}

/**
 * Balance kept separate for each currency.
 */
export class CurrencyStatementResponse {
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '0.00' })
  readonly openingBalance: string;
  @ApiProperty({ example: '60000.00' })
  readonly charges: string;
  @ApiProperty({ example: '0.00' })
  readonly payments: string;
  @ApiProperty({ example: '60000.00' })
  readonly outstanding: string;
  @ApiProperty({ type: StatementEntryResponse, isArray: true })
  readonly entries: StatementEntryResponse[];
  constructor(statement: CurrencyStatement) {
    this.currency = statement.currency;
    this.openingBalance = statement.openingBalance;
    this.charges = statement.charges;
    this.payments = statement.payments;
    this.outstanding = statement.outstanding;
    this.entries = statement.entries.map((entry) => new StatementEntryResponse(entry));
  }
}

/**
 * Delivered invoice that has not been paid.
 */
export class UnpaidInvoiceResponse {
  @ApiProperty({ example: 1 })
  readonly invoiceId: number;
  @ApiProperty({ example: 2 })
  readonly orderId: number;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '60000.00' })
  readonly amount: string;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly deliveredAt: Date;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly dueDate: Date;
  @ApiProperty({ example: true })
  readonly overdue: boolean;
  constructor(invoice: UnpaidInvoice) {
    this.invoiceId = invoice.invoiceId;
    this.orderId = invoice.orderId;
    this.currency = invoice.currency;
    this.amount = invoice.amount;
    this.deliveredAt = invoice.deliveredAt;
    this.dueDate = invoice.dueDate;
    this.overdue = invoice.overdue;
  }
}

/**
 * Pharmacy account statement.
 */
export class PharmacyStatementResponse {
  @ApiProperty({ example: 1 })
  readonly pharmacyId: number;
  @ApiProperty({ example: 'Al Shifa Pharmacy' })
  readonly pharmacyName: string;
  @ApiProperty({ type: CurrencyStatementResponse, isArray: true })
  readonly currencies: CurrencyStatementResponse[];
  @ApiProperty({ type: UnpaidInvoiceResponse, isArray: true })
  readonly unpaidInvoices: UnpaidInvoiceResponse[];
  constructor(statement: PharmacyStatement) {
    this.pharmacyId = statement.pharmacy.id;
    this.pharmacyName = statement.pharmacy.name;
    this.currencies = statement.currencies.map((currency) => new CurrencyStatementResponse(currency));
    this.unpaidInvoices = statement.unpaidInvoices.map((invoice) => new UnpaidInvoiceResponse(invoice));
  }
}
