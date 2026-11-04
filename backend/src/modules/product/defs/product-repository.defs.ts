import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { ResolvedOffer } from '@/modules/product/helpers/product-offer.helper';
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
export interface CreateProductRepoInput extends ResolvedProductPrices, ResolvedOffer {
  readonly category: ProductCategory;
  readonly saleUnit: SaleUnit;
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
  readonly category?: ProductCategory;
  readonly saleUnit?: SaleUnit;
  readonly offerActive?: boolean;
  readonly offerPaidUnits?: number | null;
  readonly offerFreeUnits?: number | null;
  readonly offerStartsAt?: Date | null;
  readonly offerEndsAt?: Date | null;
}
