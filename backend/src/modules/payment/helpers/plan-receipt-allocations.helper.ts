import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { MoneyTotal } from '@/modules/invoice/helpers/invoice-totals.helper';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { moneyEquals, sumMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Invoice money the receipt is allowed to cover in full.
 */
export interface PayableInvoice {
  readonly id: number;
  readonly orderId: number;
  readonly pharmacyId: number;
  readonly status: InvoiceStatus;
  readonly totals: readonly MoneyTotal[];
}

/**
 * One whole invoice covered by a receipt.
 */
export interface ReceiptAllocation {
  readonly invoiceId: number;
  readonly amount: string;
  readonly currency: InvoiceCurrency;
}

/**
 * Accepts a receipt only when its amount equals the full total of every selected invoice.
 */
export function planReceiptAllocations(input: { readonly pharmacyId: number; readonly currency: InvoiceCurrency; readonly amount: string; readonly invoiceIds: readonly number[]; readonly invoices: readonly PayableInvoice[] }): ReceiptAllocation[] {
  assertUniqueInvoices(input.invoiceIds);
  const selected = input.invoiceIds.map((invoiceId) => findInvoice(input.invoices, invoiceId));
  const allocations = selected.map((invoice) => toAllocation(invoice, input.pharmacyId, input.currency));
  const covered = sumMoney(allocations.map((allocation) => allocation.amount));
  if (!moneyEquals(covered, input.amount)) {
    throw new InvalidStateException({ message: 'The receipt amount must equal the full total of the selected invoices', code: 'RECEIPT_AMOUNT_MISMATCH' });
  }
  return allocations;
}

function assertUniqueInvoices(invoiceIds: readonly number[]): void {
  if (new Set(invoiceIds).size !== invoiceIds.length) {
    throw new InvalidStateException({ message: 'An invoice can be listed once on a receipt', code: 'INVOICE_DUPLICATED' });
  }
}

function findInvoice(invoices: readonly PayableInvoice[], invoiceId: number): PayableInvoice {
  const invoice = invoices.find((item) => item.id === invoiceId);
  if (!invoice) {
    throw new ResourceNotFoundException('Invoice', invoiceId);
  }
  return invoice;
}

function toAllocation(invoice: PayableInvoice, pharmacyId: number, currency: InvoiceCurrency): ReceiptAllocation {
  if (invoice.pharmacyId !== pharmacyId) {
    throw new InvalidStateException({ message: 'The invoice belongs to another pharmacy', code: 'INVOICE_PHARMACY_MISMATCH' });
  }
  if (invoice.status !== InvoiceStatus.DELIVERED_UNPAID) {
    throw new InvalidStateException({ message: 'Only an invoice delivered without payment can be covered by a receipt', code: 'INVOICE_NOT_DUE' });
  }
  if (invoice.totals.length !== 1 || invoice.totals[0].currency !== currency) {
    throw new InvalidStateException({ message: 'The receipt currency must be the only currency on the invoice', code: 'INVOICE_CURRENCY_MISMATCH' });
  }
  return { invoiceId: invoice.id, amount: invoice.totals[0].amount, currency };
}
