import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';

/**
 * Quantity link chosen by the administrator before the primary rule is applied.
 */
export interface ProductStockSelection {
  readonly warehouseId: number;
  readonly quantity: number;
  readonly isPrimary?: boolean;
}

/**
 * Quantity link stored for one product.
 */
export interface NormalizedProductStock {
  readonly warehouseId: number;
  readonly quantity: number;
  readonly isPrimary: boolean;
}

/**
 * Keeps one primary warehouse. A single warehouse is primary even when the flag is omitted.
 */
export function normalizeProductStocks(stocks: readonly ProductStockSelection[]): NormalizedProductStock[] {
  const seenWarehouseIds = new Set<number>();
  stocks.forEach((stock) => {
    if (seenWarehouseIds.has(stock.warehouseId)) {
      throw new InvalidStateException({
        message: 'A product cannot be linked to the same warehouse twice',
        code: 'WAREHOUSE_LINK_DUPLICATED',
      });
    }
    seenWarehouseIds.add(stock.warehouseId);
  });
  if (stocks.length === 1) {
    const onlyStock = stocks[0];
    return [{ warehouseId: onlyStock.warehouseId, quantity: onlyStock.quantity, isPrimary: true }];
  }
  const primaryCount = stocks.filter((stock) => stock.isPrimary === true).length;
  if (primaryCount !== 1) {
    throw new InvalidStateException({
      message: 'A product must have exactly one primary warehouse',
      code: 'PRIMARY_WAREHOUSE_REQUIRED',
    });
  }
  return stocks.map((stock) => ({
    warehouseId: stock.warehouseId,
    quantity: stock.quantity,
    isPrimary: stock.isPrimary === true,
  }));
}

/**
 * Rejects a maximum order quantity below the minimum.
 */
export function assertOrderLimits(minimumOrderQuantity: number, maximumOrderQuantity: number): void {
  if (maximumOrderQuantity < minimumOrderQuantity) {
    throw new InvalidStateException({
      message: 'The maximum order quantity must be at least the minimum',
      code: 'ORDER_LIMIT_INVALID',
    });
  }
}
