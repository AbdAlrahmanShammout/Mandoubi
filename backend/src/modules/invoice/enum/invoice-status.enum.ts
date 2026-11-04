/**
 * Review and delivery state of one invoice.
 */
export enum InvoiceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ASSIGNED = 'ASSIGNED',
  DELIVERED_PAID = 'DELIVERED_PAID',
  DELIVERED_UNPAID = 'DELIVERED_UNPAID',
  NOT_DELIVERED = 'NOT_DELIVERED',
}
