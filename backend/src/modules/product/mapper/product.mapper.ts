import { InternalException } from '@/common/exceptions/internal.exception';
import { ManufacturerMapper } from '@/modules/manufacturer/mapper/manufacturer.mapper';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
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
