import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { NormalizedProductStock } from '@/modules/product/helpers/normalize-product-stocks.helper';

/**
 * Prices stored on a product after the Syrian-pound switch is applied.
 */
export interface ResolvedProductPrices {
  readonly pharmacyPriceUsd: string;
  readonly pharmacyPriceSyp: string;
  readonly consumerPriceUsd: string;
  readonly consumerPriceSyp: string;
  readonly calculateSypFromRate: boolean;
  readonly invoiceCurrency: InvoiceCurrency;
}

/**
 * Product row plus the stock rows created with it.
 */
export interface CreateProductRepoInput extends ResolvedProductPrices {
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
  readonly pharmacyPriceUsd?: string;
  readonly pharmacyPriceSyp?: string;
  readonly consumerPriceUsd?: string;
  readonly consumerPriceSyp?: string;
  readonly calculateSypFromRate?: boolean;
  readonly invoiceCurrency?: InvoiceCurrency;
}
