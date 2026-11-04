import { TransactionContext } from '@/common/base/transaction-context';
import { ChangePrimaryWarehouseRepoInput, ReplaceProductStocksRepoInput, UpdateProductStockQuantityRepoInput } from '@/modules/product/defs/product-stock-repository.defs';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';

/**
 * Persistence contract for product quantities.
 */
export abstract class ProductStockRepository {
  /** Replaces every stock row of one product. */
  abstract replaceForProduct(input: ReplaceProductStocksRepoInput, context?: TransactionContext): Promise<void>;
  /** Updates one warehouse quantity. Returns false when that link does not exist. */
  abstract updateQuantity(input: UpdateProductStockQuantityRepoInput, context?: TransactionContext): Promise<boolean>;
  /** Moves the primary flag to one linked warehouse. Returns false when that link does not exist. */
  abstract changePrimary(input: ChangePrimaryWarehouseRepoInput, context?: TransactionContext): Promise<boolean>;
  /** Lists stock rows stored in one warehouse. */
  abstract listByWarehouseId(warehouseId: number): Promise<ProductStockEntity[]>;
}
