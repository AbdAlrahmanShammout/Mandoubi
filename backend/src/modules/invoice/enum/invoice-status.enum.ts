/**
 * Review state of one invoice. Delivery states are added when assignment exists.
 */
export enum InvoiceStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}
