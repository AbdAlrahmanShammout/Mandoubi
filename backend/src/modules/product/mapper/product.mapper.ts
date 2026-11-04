import { InternalException } from '@/common/exceptions/internal.exception';
import { ManufacturerMapper } from '@/modules/manufacturer/mapper/manufacturer.mapper';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { formatMoney } from '@/modules/product/helpers/syp-price.helper';
import { ProductStockMapper } from '@/modules/product/mapper/product-stock.mapper';
import { ProductType } from '@/modules/product/types/product-details-schema.type';

/**
 * Maps a product row to the domain entity.
 */
export class ProductMapper {
  /**
   * Copies the persistence payload into a product entity, including stock rows.
   */
  static toEntity(payload: ProductType): ProductEntity {
    if (!payload.manufacturer || !payload.stocks) {
      throw new InternalException('The product relations were not loaded');
    }
    const product = new ProductEntity({
      id: payload.id,
      name: payload.name,
      barcode: payload.barcode,
      manufacturerId: payload.manufacturerId,
      activeIngredient: payload.activeIngredient,
      imageUrl: payload.imageUrl,
      minimumOrderQuantity: payload.minimumOrderQuantity,
      maximumOrderQuantity: payload.maximumOrderQuantity,
      lowQuantityThreshold: payload.lowQuantityThreshold,
      pharmacyPriceUsd: formatMoney(payload.pharmacyPriceUsd),
      pharmacyPriceSyp: formatMoney(payload.pharmacyPriceSyp),
      consumerPriceUsd: formatMoney(payload.consumerPriceUsd),
      consumerPriceSyp: formatMoney(payload.consumerPriceSyp),
      calculateSypFromRate: payload.calculateSypFromRate,
      invoiceCurrency: payload.invoiceCurrency as InvoiceCurrency,
      category: payload.category as ProductCategory,
      saleUnit: payload.saleUnit as SaleUnit,
      offerActive: payload.offerActive,
      offerPaidUnits: payload.offerPaidUnits,
      offerFreeUnits: payload.offerFreeUnits,
      offerStartsAt: payload.offerStartsAt,
      offerEndsAt: payload.offerEndsAt,
      availability: payload.availability as ProductAvailability,
      status: payload.status as ProductStatus,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
      deletedAt: payload.deletedAt,
    });
    product.manufacturer = ManufacturerMapper.toEntity(payload.manufacturer);
    product.stocks = payload.stocks.map((stock) => ProductStockMapper.toEntity(stock));
    return product;
  }
}
