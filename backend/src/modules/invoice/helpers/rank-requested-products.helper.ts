/**
 * Paid quantity a pharmacy has requested of one product.
 */
export interface RequestedProductTotal {
  readonly productId: number;
  readonly requestedQuantity: number;
}

/**
 * Orders requested products by paid quantity, then by product id. Rejected invoices still count, because the pharmacy requested them.
 */
export function rankRequestedProducts(rows: readonly RequestedProductTotal[]): RequestedProductTotal[] {
  return [...rows].sort((left, right) => right.requestedQuantity - left.requestedQuantity || left.productId - right.productId);
}
