import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { subtractMoney, sumMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Amount posted when an invoice is delivered.
 */
export interface StatementCharge {
  readonly invoiceId: number;
  readonly orderId: number;
  readonly status: InvoiceStatus;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly deliveredAt: Date;
}

/**
 * Amount received for one or more invoices.
 */
export interface StatementCredit {
  readonly paymentId: number;
  readonly kind: PaymentKind;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly occurredAt: Date;
  readonly invoiceIds: readonly number[];
}

/**
 * One line on the pharmacy statement.
 */
export interface StatementEntry {
  readonly kind: 'CHARGE' | PaymentKind;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly occurredAt: Date;
  readonly invoiceId: number | null;
  readonly paymentId: number | null;
}

/**
 * Balance of one currency.
 */
export interface CurrencyStatement {
  readonly currency: InvoiceCurrency;
  readonly openingBalance: string;
  readonly charges: string;
  readonly payments: string;
  readonly outstanding: string;
  readonly entries: readonly StatementEntry[];
}

/**
 * Invoice that was delivered and is still unpaid.
 */
export interface UnpaidInvoice {
  readonly invoiceId: number;
  readonly orderId: number;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly deliveredAt: Date;
  readonly dueDate: Date;
  readonly overdue: boolean;
}

/**
 * Builds the pharmacy statement from delivered invoices and recorded payments.
 */
export function buildPharmacyStatement(input: { readonly charges: readonly StatementCharge[]; readonly credits: readonly StatementCredit[]; readonly now: Date }): { readonly currencies: CurrencyStatement[]; readonly unpaidInvoices: UnpaidInvoice[] } {
  const currencies = groupCurrencies(input.charges, input.credits);
  const paidInvoiceIds = new Set(input.credits.flatMap((credit) => credit.invoiceIds));
  const unpaidInvoices = input.charges.filter((charge) => charge.status === InvoiceStatus.DELIVERED_UNPAID && !paidInvoiceIds.has(charge.invoiceId)).map((charge) => ({
    invoiceId: charge.invoiceId,
    orderId: charge.orderId,
    currency: charge.currency,
    amount: charge.amount,
    deliveredAt: charge.deliveredAt,
    dueDate: charge.deliveredAt,
    overdue: charge.deliveredAt < input.now,
  }));
  return { currencies, unpaidInvoices };
}

function groupCurrencies(charges: readonly StatementCharge[], credits: readonly StatementCredit[]): CurrencyStatement[] {
  const currencies = uniqueCurrencies(charges, credits);
  return currencies.map((currency) => toCurrencyStatement(currency, charges, credits));
}

function uniqueCurrencies(charges: readonly StatementCharge[], credits: readonly StatementCredit[]): InvoiceCurrency[] {
  return [...new Set([...charges.map((charge) => charge.currency), ...credits.map((credit) => credit.currency)])];
}

function toCurrencyStatement(currency: InvoiceCurrency, charges: readonly StatementCharge[], credits: readonly StatementCredit[]): CurrencyStatement {
  const currencyCharges = charges.filter((charge) => charge.currency === currency);
  const currencyCredits = credits.filter((credit) => credit.currency === currency);
  const chargeTotal = sumMoney(currencyCharges.map((charge) => charge.amount));
  const paymentTotal = sumMoney(currencyCredits.map((credit) => credit.amount));
  const entries = [
    ...currencyCharges.map((charge) => ({ kind: 'CHARGE' as const, currency, amount: charge.amount, occurredAt: charge.deliveredAt, invoiceId: charge.invoiceId, paymentId: null })),
    ...currencyCredits.map((credit) => ({ kind: credit.kind, currency, amount: credit.amount, occurredAt: credit.occurredAt, invoiceId: null, paymentId: credit.paymentId })),
  ].sort((left, right) => left.occurredAt.getTime() - right.occurredAt.getTime());
  return { currency, openingBalance: '0.00', charges: chargeTotal, payments: paymentTotal, outstanding: subtractMoney(chargeTotal, paymentTotal), entries };
}
