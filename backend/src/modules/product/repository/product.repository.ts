import { TransactionContext } from '@/common/base/transaction-context';
import { CreateProductRepoInput, UpdateProductRepoInput } from '@/modules/product/defs/product-repository.defs';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';

/**
 * Product search applied before the page is cut.
 */
export interface ProductSearchInput {
  readonly search?: string;
  readonly category?: ProductCategory;
  readonly availability?: ProductAvailability;
  readonly status?: ProductStatus;
  readonly limit: number;
  readonly offset: number;
}

/**
 * Pharmacy catalog search. Disabled products stay out of the page.
 */
export interface PharmacyCatalogSearchInput {
  readonly search?: string;
  readonly category?: ProductCategory;
  readonly limit: number;
  readonly offset: number;
}

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
  /** Returns one page of products matching the search and filters, plus the full match count. */
  abstract search(input: ProductSearchInput): Promise<{ readonly items: readonly ProductEntity[]; readonly total: number }>;
  /** Returns one page of active products for the pharmacy catalog, sorted by name. */
  abstract searchCatalog(input: PharmacyCatalogSearchInput): Promise<{ readonly items: readonly ProductEntity[]; readonly total: number }>;
  /** Loads products that have not been removed. Missing ids are omitted. */
  abstract listByIds(ids: readonly number[]): Promise<ProductEntity[]>;
  /** Updates product fields and returns the product, or null when it is missing. */
  abstract update(input: UpdateProductRepoInput, context?: TransactionContext): Promise<ProductEntity | null>;
  /** Recalculates Syrian-pound prices for products whose switch is on. */
  abstract recalculateSypPrices(usdToSyp: string, context?: TransactionContext): Promise<void>;
}
