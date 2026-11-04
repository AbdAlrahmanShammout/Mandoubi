import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ProductStockReservation, ReplacementStock } from '@/modules/product/defs/product-stock-repository.defs';
import { NormalizedProductStock } from '@/modules/product/helpers/normalize-product-stocks.helper';

/**
 * Keeps reserved quantity on the same warehouse when the links are replaced.
 */
export function preserveReservedStock(current: readonly ProductStockReservation[], next: readonly NormalizedProductStock[]): ReplacementStock[] {
  for (const stock of current) {
    assertReservationKept(stock, next);
  }
  return next.map((stock) => ({
    warehouseId: stock.warehouseId,
    quantity: stock.quantity,
    isPrimary: stock.isPrimary,
    reservedQuantity: current.find((item) => item.warehouseId === stock.warehouseId)?.reservedQuantity ?? 0,
  }));
}

function assertReservationKept(stock: ProductStockReservation, next: readonly NormalizedProductStock[]): void {
  if (stock.reservedQuantity === 0) {
    return;
  }
  const replacement = next.find((item) => item.warehouseId === stock.warehouseId);
  if (!replacement || replacement.quantity < stock.reservedQuantity) {
    throw new InvalidStateException({
      message: 'Reserved quantity stays on the warehouse that holds it',
      code: 'RESERVED_STOCK_LOCKED',
    });
  }
}
