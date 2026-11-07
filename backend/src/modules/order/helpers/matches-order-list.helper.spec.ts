import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';
import { matchesOrderList } from '@/modules/order/helpers/matches-order-list.helper';

describe('matchesOrderList', () => {
  const pending = { id: 12, pharmacyName: 'Al Noor', invoiceStatuses: [InvoiceStatus.PENDING] };
  it('matches an order number contained in the text and the pharmacy name', () => {
    expect(matchesOrderList(pending, { search: '12' })).toBe(true);
    expect(matchesOrderList(pending, { search: '120' })).toBe(false);
    expect(matchesOrderList(pending, { search: 'noor' })).toBe(true);
  });
  it('matches the derived status before a page is cut', () => {
    expect(matchesOrderList(pending, { status: OrderStatus.PENDING })).toBe(true);
    expect(matchesOrderList(pending, { status: OrderStatus.APPROVED })).toBe(false);
  });
});
