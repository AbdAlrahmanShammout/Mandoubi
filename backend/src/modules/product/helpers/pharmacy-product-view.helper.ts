import { InternalException } from '@/common/exceptions/internal.exception';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

/**
 * Product fields the pharmacy app is allowed to see.
 */
export interface PharmacyProductView {
  readonly name: string;
  readonly barcode: string;
  readonly manufacturerName: string;
  readonly activeIngredient: string;
  readonly imageUrl: string | null;
  readonly category: ProductCategory;
  readonly saleUnit: SaleUnit;
  readonly availability: ProductAvailability;
  readonly status: ProductStatus;
  readonly invoiceCurrency: InvoiceCurrency;
  readonly pharmacyUnitPrice: string;
  readonly consumerUnitPrice: string;
  readonly minimumOrderQuantity: number;
  readonly maximumOrderQuantity: number;
  readonly availableQuantity: number;
  readonly limitedQuantity: boolean;
  readonly offerActive: boolean;
  readonly offerPaidUnits: number | null;
  readonly offerFreeUnits: number | null;
  readonly offerStartsAt: Date | null;
  readonly offerEndsAt: Date | null;
}

/**
 * Projects one product onto the pharmacy catalog. Prices follow the invoice currency, and quantity is the primary warehouse only.
 */
export function toPharmacyProductView(product: ProductEntity): PharmacyProductView {
  if (!product.manufacturer) {
    throw new InternalException('The product manufacturer was not loaded');
  }
  const availableQuantity = readAvailableQuantity(product);
  const usesUsd = product.invoiceCurrency === InvoiceCurrency.USD;
  return {
    name: product.name,
    barcode: product.barcode,
    manufacturerName: product.manufacturer.name,
    activeIngredient: product.activeIngredient,
    imageUrl: product.imageUrl,
    category: product.category,
    saleUnit: product.saleUnit,
    availability: product.availability,
    status: product.status,
    invoiceCurrency: product.invoiceCurrency,
    pharmacyUnitPrice: usesUsd ? product.pharmacyPriceUsd : product.pharmacyPriceSyp,
    consumerUnitPrice: usesUsd ? product.consumerPriceUsd : product.consumerPriceSyp,
    minimumOrderQuantity: product.minimumOrderQuantity,
    maximumOrderQuantity: product.maximumOrderQuantity,
    availableQuantity,
    limitedQuantity: availableQuantity <= product.lowQuantityThreshold,
    offerActive: product.offerActive,
    offerPaidUnits: product.offerPaidUnits,
    offerFreeUnits: product.offerFreeUnits,
    offerStartsAt: product.offerStartsAt,
    offerEndsAt: product.offerEndsAt,
  };
}

function readAvailableQuantity(product: ProductEntity): number {
  const primary = product.stocks?.find((stock) => stock.isPrimary);
  if (!primary) {
    return 0;
  }
  return Math.max(primary.quantity - primary.reservedQuantity, 0);
}
