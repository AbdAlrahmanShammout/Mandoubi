import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';

/**
 * Calculates the parent order state from the invoices that belong to it.
 */
export function deriveOrderStatus(statuses: readonly InvoiceStatus[]): OrderStatus {
  if (statuses.length === 0 || statuses.every((status) => status === InvoiceStatus.PENDING)) {
    return OrderStatus.PENDING;
  }
  if (statuses.every((status) => status === InvoiceStatus.APPROVED)) {
    return OrderStatus.APPROVED;
  }
  const reviewFinished = statuses.every((status) => status === InvoiceStatus.APPROVED || status === InvoiceStatus.REJECTED);
  const anyApproved = statuses.some((status) => status === InvoiceStatus.APPROVED);
  if (reviewFinished && !anyApproved) {
    return OrderStatus.COMPLETED;
  }
  return OrderStatus.PARTIALLY_APPROVED;
}
