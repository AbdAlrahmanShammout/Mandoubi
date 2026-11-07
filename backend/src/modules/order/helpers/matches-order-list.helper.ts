import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';
import { deriveOrderStatus } from '@/modules/order/helpers/derive-order-status.helper';

export interface OrderListStub {
  readonly id: number;
  readonly pharmacyName: string;
  readonly invoiceStatuses: readonly InvoiceStatus[];
}

export interface OrderListMatch {
  readonly search?: string;
  readonly status?: OrderStatus;
}

/**
 * Keeps an order when its number or pharmacy name matches and its derived status matches.
 */
export function matchesOrderList(order: OrderListStub, query: OrderListMatch): boolean {
  const matchesStatus = query.status === undefined || deriveOrderStatus(order.invoiceStatuses) === query.status;
  if (!matchesStatus) {
    return false;
  }
  const search = query.search?.trim();
  if (!search) {
    return true;
  }
  const needle = search.toLowerCase();
  return String(order.id).includes(needle) || order.pharmacyName.toLowerCase().includes(needle);
}
