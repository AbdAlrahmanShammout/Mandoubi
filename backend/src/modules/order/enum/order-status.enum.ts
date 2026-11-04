/**
 * Parent order state derived from its invoices. It is not stored.
 */
export enum OrderStatus {
  PENDING = 'PENDING',
  PARTIALLY_APPROVED = 'PARTIALLY_APPROVED',
  APPROVED = 'APPROVED',
  COMPLETED = 'COMPLETED',
}
