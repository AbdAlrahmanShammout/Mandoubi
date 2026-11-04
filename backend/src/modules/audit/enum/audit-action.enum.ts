/**
 * Change that must stay in the append-only audit trail.
 */
export enum AuditAction {
  STOCK_QUANTITY_CHANGED = 'STOCK_QUANTITY_CHANGED',
  INVOICE_STATUS_CHANGED = 'INVOICE_STATUS_CHANGED',
  PAYMENT_RECORDED = 'PAYMENT_RECORDED',
}
