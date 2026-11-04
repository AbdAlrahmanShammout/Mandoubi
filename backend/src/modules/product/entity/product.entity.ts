import { BaseEntity } from '@/common/base/base.entity';
import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import type { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';
import { ProductZodType } from '@/modules/product/zod/product.zod';

/**
 * Catalog product. Quantities live on stock rows, not as copies of this product.
 */
export class ProductEntity extends BaseEntity {
  name!: string;
  barcode!: string;
  manufacturerId!: number;
  activeIngredient!: string;
  imageUrl!: string | null;
  minimumOrderQuantity!: number;
  maximumOrderQuantity!: number;
  lowQuantityThreshold!: number;
  pharmacyPriceUsd!: string;
  pharmacyPriceSyp!: string;
  consumerPriceUsd!: string;
  consumerPriceSyp!: string;
  calculateSypFromRate!: boolean;
  invoiceCurrency!: InvoiceCurrency;
  availability!: ProductAvailability;
  status!: ProductStatus;
  manufacturer?: ManufacturerEntity;
  stocks?: ProductStockEntity[];
  constructor(data: ProductZodType) {
    super();
    Object.assign(this, data);
  }
}
