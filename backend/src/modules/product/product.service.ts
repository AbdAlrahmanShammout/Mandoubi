import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ManufacturerService } from '@/modules/manufacturer/manufacturer.service';
import { CreateProductRepoInput, UpdateProductRepoInput } from '@/modules/product/defs/product-repository.defs';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { ProductStockSelection, assertOrderLimits, normalizeProductStocks } from '@/modules/product/helpers/normalize-product-stocks.helper';
import { ProductStockRepository } from '@/modules/product/repository/product-stock.repository';
import { ProductRepository } from '@/modules/product/repository/product.repository';
import { WarehouseService } from '@/modules/warehouse/warehouse.service';

/**
 * Input for a new product. The primary warehouse is chosen from the stock lines.
 */
interface CreateProductServiceInput extends Omit<CreateProductRepoInput, 'stocks' | 'availability' | 'status' | 'imageUrl'> {
  readonly imageUrl?: string | null;
  readonly availability?: ProductAvailability;
  readonly status?: ProductStatus;
  readonly stocks: readonly ProductStockSelection[];
}

/**
 * Products and the warehouse quantities attached to them.
 */
@Injectable()
export class ProductService {
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly productStockRepository: ProductStockRepository,
    private readonly manufacturerService: ManufacturerService,
    private readonly warehouseService: WarehouseService,
    private readonly transactionRunner: TransactionRunner,
  ) {}
  /**
   * Creates a product and its warehouse quantities. One warehouse becomes primary.
   */
  async createProduct(input: CreateProductServiceInput): Promise<ProductEntity> {
    assertOrderLimits(input.minimumOrderQuantity, input.maximumOrderQuantity);
    const stocks = normalizeProductStocks(input.stocks);
    await this.assertManufacturerActive(input.manufacturerId);
    await this.assertWarehousesExist(stocks);
    return this.productRepository.create({
      ...input,
      imageUrl: input.imageUrl ?? null,
      availability: input.availability ?? ProductAvailability.AVAILABLE,
      status: input.status ?? ProductStatus.ACTIVE,
      stocks,
    });
  }
  /**
   * Loads one product or fails when it does not exist.
   */
  async getProductById(id: number): Promise<ProductEntity> {
    const product = await this.productRepository.findById(id);
    if (!product) {
      throw new ResourceNotFoundException('Product', id);
    }
    return product;
  }
  /**
   * Lists products that have not been removed.
   */
  async listProducts(): Promise<ProductEntity[]> {
    return this.productRepository.list();
  }
  /**
   * Changes product data without changing warehouse quantities.
   */
  async updateProduct(input: UpdateProductRepoInput): Promise<ProductEntity> {
    const current = await this.getProductById(input.id);
    assertOrderLimits(input.minimumOrderQuantity ?? current.minimumOrderQuantity, input.maximumOrderQuantity ?? current.maximumOrderQuantity);
    if (input.manufacturerId !== undefined) {
      await this.assertManufacturerActive(input.manufacturerId);
    }
    const product = await this.productRepository.update(input);
    if (!product) {
      throw new ResourceNotFoundException('Product', input.id);
    }
    return product;
  }
  /**
   * Replaces the warehouse links. A lone warehouse is stored as primary.
   */
  async replaceStocks(productId: number, selections: readonly ProductStockSelection[]): Promise<ProductEntity> {
    await this.getProductById(productId);
    const stocks = normalizeProductStocks(selections);
    await this.assertWarehousesExist(stocks);
    await this.transactionRunner.run(async (context) => {
      await this.productStockRepository.replaceForProduct({ productId, stocks }, context);
    });
    return this.getProductById(productId);
  }
  /**
   * Sets one warehouse quantity and leaves the other warehouses unchanged.
   */
  async updateStockQuantity(productId: number, warehouseId: number, quantity: number): Promise<ProductEntity> {
    await this.getProductById(productId);
    const updated = await this.productStockRepository.updateQuantity({ productId, warehouseId, quantity });
    if (!updated) {
      throw new ResourceNotFoundException('Product stock', `${productId}:${warehouseId}`);
    }
    return this.getProductById(productId);
  }
  /**
   * Moves the primary flag to a warehouse the product is already linked to.
   */
  async changePrimaryWarehouse(productId: number, warehouseId: number): Promise<ProductEntity> {
    await this.getProductById(productId);
    await this.transactionRunner.run(async (context) => {
      const changed = await this.productStockRepository.changePrimary({ productId, warehouseId }, context);
      if (!changed) {
        throw new ResourceNotFoundException('Product stock', `${productId}:${warehouseId}`);
      }
    });
    return this.getProductById(productId);
  }
  /**
   * Lists the products stored in one warehouse and the quantity in that warehouse.
   */
  async listStockByWarehouseId(warehouseId: number): Promise<ProductStockEntity[]> {
    return this.productStockRepository.listByWarehouseId(warehouseId);
  }
  private async assertManufacturerActive(manufacturerId: number): Promise<void> {
    const manufacturer = await this.manufacturerService.getManufacturerById(manufacturerId);
    if (manufacturer.status !== ManufacturerStatus.ACTIVE) {
      throw new InvalidStateException({ message: 'The manufacturer is not active', code: 'MANUFACTURER_INACTIVE' });
    }
  }
  private async assertWarehousesExist(stocks: readonly ProductStockSelection[]): Promise<void> {
    await Promise.all(stocks.map(async (stock) => this.warehouseService.getWarehouseById(stock.warehouseId)));
  }
}
