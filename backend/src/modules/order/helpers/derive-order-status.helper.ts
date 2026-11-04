import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';

const FINISHED_STATUSES: readonly InvoiceStatus[] = [InvoiceStatus.REJECTED, InvoiceStatus.DELIVERED_PAID, InvoiceStatus.DELIVERED_UNPAID];
const DELIVERY_STATUSES: readonly InvoiceStatus[] = [InvoiceStatus.ASSIGNED, InvoiceStatus.DELIVERED_PAID, InvoiceStatus.DELIVERED_UNPAID, InvoiceStatus.NOT_DELIVERED];

/**
 * Calculates the parent order state from the invoices that belong to it.
 */
export function deriveOrderStatus(statuses: readonly InvoiceStatus[]): OrderStatus {
  if (statuses.length === 0 || statuses.every((status) => status === InvoiceStatus.PENDING)) {
    return OrderStatus.PENDING;
  }
  if (statuses.every((status) => FINISHED_STATUSES.includes(status))) {
    return OrderStatus.COMPLETED;
  }
  if (statuses.some((status) => DELIVERY_STATUSES.includes(status))) {
    return OrderStatus.PARTIALLY_DELIVERED;
  }
  if (statuses.every((status) => status === InvoiceStatus.APPROVED)) {
    return OrderStatus.APPROVED;
  }
  return OrderStatus.PARTIALLY_APPROVED;
}
