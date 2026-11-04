import { NormalizedProductStock } from '@/modules/product/helpers/normalize-product-stocks.helper';

/**
 * Replacement of every warehouse link for one product.
 */
export interface ReplaceProductStocksRepoInput {
  readonly productId: number;
  readonly stocks: readonly NormalizedProductStock[];
}

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
