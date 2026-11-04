import { TransactionContext } from '@/common/base/transaction-context';
import { ChangePrimaryWarehouseRepoInput, ProductStockReservation, ReplaceProductStocksRepoInput, ReserveProductStockRepoInput, StockQuantityUpdateResult, UpdateProductStockQuantityRepoInput } from '@/modules/product/defs/product-stock-repository.defs';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';

/**
 * Persistence contract for product quantities.
 */
export abstract class ProductStockRepository {
  /** Replaces every stock row of one product and keeps the reserved quantities supplied. */
  abstract replaceForProduct(input: ReplaceProductStocksRepoInput, context?: TransactionContext): Promise<void>;
  /** Updates one warehouse quantity when it still covers the reserved quantity. */
  abstract updateQuantity(input: UpdateProductStockQuantityRepoInput, context?: TransactionContext): Promise<StockQuantityUpdateResult>;
  /** Moves the primary flag to one linked warehouse. Returns false when that link does not exist. */
  abstract changePrimary(input: ChangePrimaryWarehouseRepoInput, context?: TransactionContext): Promise<boolean>;
  /** Lists stock rows stored in one warehouse. */
  abstract listByWarehouseId(warehouseId: number): Promise<ProductStockEntity[]>;
  /** Lists the reserved quantity of one product in each linked warehouse. */
  abstract listReservations(productId: number, context?: TransactionContext): Promise<ProductStockReservation[]>;
  /** Increases reserved quantity when the warehouse still has enough available stock. */
  abstract reserve(input: ReserveProductStockRepoInput, context?: TransactionContext): Promise<boolean>;
  /** Turns reserved quantity into issued quantity. Available stock stays the same. */
  abstract issue(input: ReserveProductStockRepoInput, context?: TransactionContext): Promise<boolean>;
  /** Releases a reservation without changing physical quantity. */
  abstract release(input: ReserveProductStockRepoInput, context?: TransactionContext): Promise<boolean>;
  /** Adds returned physical quantity once. The reservation is left unchanged. */
  abstract restock(input: ReserveProductStockRepoInput, context?: TransactionContext): Promise<boolean>;
}
