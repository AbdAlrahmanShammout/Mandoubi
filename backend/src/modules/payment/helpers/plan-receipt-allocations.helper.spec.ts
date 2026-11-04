import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { planReceiptAllocations } from '@/modules/payment/helpers/plan-receipt-allocations.helper';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

const due = {
  id: 1,
  orderId: 9,
  pharmacyId: 4,
  status: InvoiceStatus.DELIVERED_UNPAID,
  totals: [{ currency: InvoiceCurrency.SYP, amount: '60000.00' }],
};

describe('Receipt allocations', () => {
  it('covers the whole invoice when the amount matches', () => {
    const actual = planReceiptAllocations({ pharmacyId: 4, currency: InvoiceCurrency.SYP, amount: '60000.00', invoiceIds: [1], invoices: [due] });
    expect(actual).toEqual([{ invoiceId: 1, amount: '60000.00', currency: InvoiceCurrency.SYP }]);
  });
  it('rejects an amount that does not cover the invoice in full', () => {
    expect(() => planReceiptAllocations({ pharmacyId: 4, currency: InvoiceCurrency.SYP, amount: '1000.00', invoiceIds: [1], invoices: [due] })).toThrow(InvalidStateException);
  });
});
