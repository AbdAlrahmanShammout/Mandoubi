import { TransactionContext } from '@/common/base/transaction-context';
import { CreateProductRepoInput, UpdateProductRepoInput } from '@/modules/product/defs/product-repository.defs';
import { ProductEntity } from '@/modules/product/entity/product.entity';

/**
 * Persistence contract for products.
 */
export abstract class ProductRepository {
  /** Inserts one product and its stock rows. */
  abstract create(input: CreateProductRepoInput, context?: TransactionContext): Promise<ProductEntity>;
  /** Loads one product by id, or null when it is missing. */
  abstract findById(id: number): Promise<ProductEntity | null>;
  /** Lists products that have not been removed. */
  abstract list(): Promise<ProductEntity[]>;
  /** Updates product fields and returns the product, or null when it is missing. */
  abstract update(input: UpdateProductRepoInput, context?: TransactionContext): Promise<ProductEntity | null>;
}
