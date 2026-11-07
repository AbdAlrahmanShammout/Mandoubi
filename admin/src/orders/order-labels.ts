import type { InvoiceItemRecord, InvoiceRecord, InvoiceStatus, MoneyTotal, OrderStatus, ProductRecord, RejectInvoiceInput, WarehouseRecord } from '@/api/api-types';

const ORDER_STATUS_LABELS: Record<OrderStatus, readonly [string, string]> = {
  PENDING: ['قيد المراجعة', 'amber'],
  PARTIALLY_APPROVED: ['موافقة جزئية', 'amber'],
  APPROVED: ['موافق عليها', 'green'],
  PARTIALLY_DELIVERED: ['تسليم جزئي', 'blue'],
  COMPLETED: ['مكتمل', 'green'],
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, readonly [string, string]> = {
  PENDING: ['قيد المراجعة', 'amber'],
  APPROVED: ['موافق عليها', 'green'],
  REJECTED: ['مرفوضة', 'red'],
  ASSIGNED: ['مسنَدة لسائق', 'blue'],
  DELIVERED_PAID: ['سُلّمت ومدفوعة', 'green'],
  DELIVERED_UNPAID: ['سُلّمت وغير مدفوعة', 'amber'],
  NOT_DELIVERED: ['لم تُسلّم', 'red'],
  RETURNED_TO_WAREHOUSE: ['عادت للمستودع', 'violet'],
  OUT_FOR_DELIVERY: ['خرجت للتسليم', 'blue'],
};

export interface LineAvailability {
  readonly warehouseName: string;
  readonly availableQuantity: number | null;
  readonly isShort: boolean;
}

/**
 * Arabic label and badge tone for a derived order status.
 */
export function orderStatusLabel(status: OrderStatus): readonly [string, string] {
  return ORDER_STATUS_LABELS[status];
}

/**
 * Arabic label and badge tone for one invoice status.
 */
export function invoiceStatusLabel(status: InvoiceStatus): readonly [string, string] {
  return INVOICE_STATUS_LABELS[status];
}

/**
 * Amount plus its currency, as stored on the invoice.
 */
export function formatMoney(amount: string, currency: MoneyTotal['currency']): string {
  return `${amount} ${currency === 'USD' ? 'USD' : 'ل.س'}`;
}

/**
 * Rejection label and free-text note stored on an invoice, when either exists.
 */
export function rejectionSummary(invoice: Pick<InvoiceRecord, 'rejectionReasonLabel' | 'customReason'>): string {
  return [invoice.rejectionReasonLabel, invoice.customReason].filter((part) => part !== null && part.trim().length > 0).join(' · ');
}

/**
 * Reject body for a fixed reason, a free-text note, neither, or both.
 */
export function buildRejectInput(reasonId: string, note: string): RejectInvoiceInput {
  const customReason = note.trim();
  return {
    ...(reasonId.trim().length > 0 ? { rejectionReasonId: Number(reasonId) } : {}),
    ...(customReason.length > 0 ? { customReason } : {}),
  };
}

/**
 * Current available quantity at the warehouse stored on the invoice line.
 * A later change of the product primary warehouse is ignored.
 */
export function readLineAvailability(item: InvoiceItemRecord, products: readonly ProductRecord[], warehouses: readonly WarehouseRecord[]): LineAvailability {
  const product = products.find((entry) => entry.id === item.productId);
  const stock = product?.stocks.find((entry) => entry.warehouseId === item.primaryWarehouseId);
  const warehouse = warehouses.find((entry) => entry.id === item.primaryWarehouseId);
  const availableQuantity = stock?.availableQuantity ?? null;
  return {
    warehouseName: stock?.warehouseName ?? warehouse?.name ?? `#${item.primaryWarehouseId}`,
    availableQuantity,
    isShort: availableQuantity !== null && availableQuantity < item.totalQuantity,
  };
}
