import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { planReturnStock } from '@/modules/return-record/helpers/plan-return-stock.helper';

describe('Return stock', () => {
  it('releases a missed delivery and restocks an unpaid delivery once', () => {
    expect(planReturnStock(InvoiceStatus.NOT_DELIVERED)).toBe('release');
    expect(planReturnStock(InvoiceStatus.DELIVERED_UNPAID)).toBe('restock');
    expect(() => planReturnStock(InvoiceStatus.DELIVERED_PAID)).toThrow(InvalidStateException);
  });
});
