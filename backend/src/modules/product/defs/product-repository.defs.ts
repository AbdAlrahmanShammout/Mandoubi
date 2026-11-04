import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { NormalizedProductStock } from '@/modules/product/helpers/normalize-product-stocks.helper';

/**
 * Product row plus the stock rows created with it.
 */
export interface CreateProductRepoInput {
  readonly name: string;
  readonly barcode: string;
  readonly manufacturerId: number;
  readonly activeIngredient: string;
  readonly imageUrl: string | null;
  readonly minimumOrderQuantity: number;
  readonly maximumOrderQuantity: number;
  readonly lowQuantityThreshold: number;
  readonly availability: ProductAvailability;
  readonly status: ProductStatus;
  readonly stocks: readonly NormalizedProductStock[];
}

/**
 * Product fields an administrator can change. Stock is replaced separately.
 */
export interface UpdateProductRepoInput {
  readonly id: number;
  readonly name?: string;
  readonly barcode?: string;
  readonly manufacturerId?: number;
  readonly activeIngredient?: string;
  readonly imageUrl?: string | null;
  readonly minimumOrderQuantity?: number;
  readonly maximumOrderQuantity?: number;
  readonly lowQuantityThreshold?: number;
  readonly availability?: ProductAvailability;
  readonly status?: ProductStatus;
}
