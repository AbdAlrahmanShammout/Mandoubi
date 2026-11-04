import { describe, expect, it } from '@jest/globals';
import { buildPharmacyStatement } from '@/modules/pharmacy-ledger/helpers/build-pharmacy-statement.helper';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

describe('Pharmacy statement', () => {
  it('keeps a delivered unpaid invoice due until a receipt covers it', () => {
    const deliveredAt = new Date('2026-11-05T00:00:00.000Z');
    const open = buildPharmacyStatement({
      charges: [{ invoiceId: 1, orderId: 2, status: InvoiceStatus.DELIVERED_UNPAID, currency: InvoiceCurrency.SYP, amount: '60000.00', deliveredAt }],
      credits: [],
      now: new Date('2026-11-05T01:00:00.000Z'),
    });
    expect(open.currencies[0].outstanding).toBe('60000.00');
    expect(open.unpaidInvoices).toHaveLength(1);
    const paid = buildPharmacyStatement({
      charges: [{ invoiceId: 1, orderId: 2, status: InvoiceStatus.DELIVERED_UNPAID, currency: InvoiceCurrency.SYP, amount: '60000.00', deliveredAt }],
      credits: [{ paymentId: 8, kind: PaymentKind.RECEIPT, currency: InvoiceCurrency.SYP, amount: '60000.00', occurredAt: deliveredAt, invoiceIds: [1] }],
      now: deliveredAt,
    });
    expect(paid.currencies[0].outstanding).toBe('0.00');
    expect(paid.unpaidInvoices).toHaveLength(0);
  });
});
