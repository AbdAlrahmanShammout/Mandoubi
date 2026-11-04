import { NormalizedProductStock } from '@/modules/product/helpers/normalize-product-stocks.helper';

/**
 * Warehouse link written with the reserved quantity already held there.
 */
export interface ReplacementStock extends NormalizedProductStock {
  readonly reservedQuantity: number;
}

/**
 * Replacement of every warehouse link for one product.
 */
export interface ReplaceProductStocksRepoInput {
  readonly productId: number;
  readonly stocks: readonly ReplacementStock[];
}

/**
 * Reserved quantity already held for one product in one warehouse.
 */
export interface ProductStockReservation {
  readonly warehouseId: number;
  readonly reservedQuantity: number;
}

/**
 * Quantity reserved from the warehouse recorded on an invoice.
 */
export interface ReserveProductStockRepoInput {
  readonly productId: number;
  readonly warehouseId: number;
  readonly quantity: number;
}

/**
 * Result of changing a physical quantity while reservations stay in place.
 */
export type StockQuantityUpdateResult = 'updated' | 'missing' | 'locked';

/**
 * New physical quantity for one product in one warehouse.
 */
export interface UpdateProductStockQuantityRepoInput {
  readonly productId: number;
  readonly warehouseId: number;
  readonly quantity: number;
}

/**
 * Warehouse that should become the only primary warehouse.
 */
export interface ChangePrimaryWarehouseRepoInput {
  readonly productId: number;
  readonly warehouseId: number;
}
