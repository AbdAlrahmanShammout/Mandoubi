import { Injectable } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { ExchangeRateService } from '@/modules/exchange-rate/exchange-rate.service';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ManufacturerService } from '@/modules/manufacturer/manufacturer.service';
import { MONEY_PATTERN } from '@/modules/product/constants/money.constant';
import { CreateProductRepoInput, ResolvedProductPrices, UpdateProductRepoInput } from '@/modules/product/defs/product-repository.defs';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { ProductStockSelection, assertOrderLimits, normalizeProductStocks } from '@/modules/product/helpers/normalize-product-stocks.helper';
import { calculateSypPrice } from '@/modules/product/helpers/syp-price.helper';
import { ProductStockRepository } from '@/modules/product/repository/product-stock.repository';
import { ProductRepository } from '@/modules/product/repository/product.repository';
import { WarehouseService } from '@/modules/warehouse/warehouse.service';

/**
 * Input for a new product. The primary warehouse is chosen from the stock lines.
 */
interface PriceSelection {
  readonly pharmacyPriceUsd?: string;
  readonly pharmacyPriceSyp?: string;
  readonly consumerPriceUsd?: string;
  readonly consumerPriceSyp?: string;
  readonly calculateSypFromRate?: boolean;
  readonly invoiceCurrency?: InvoiceCurrency;
}

interface CreateProductServiceInput extends Omit<CreateProductRepoInput, 'stocks' | 'availability' | 'status' | 'imageUrl' | keyof ResolvedProductPrices>, PriceSelection {
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
    private readonly exchangeRateService: ExchangeRateService,
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
    const prices = await this.resolvePrices(input);
    return this.productRepository.create({
      name: input.name,
      barcode: input.barcode,
      manufacturerId: input.manufacturerId,
      activeIngredient: input.activeIngredient,
      imageUrl: input.imageUrl ?? null,
      minimumOrderQuantity: input.minimumOrderQuantity,
      maximumOrderQuantity: input.maximumOrderQuantity,
      lowQuantityThreshold: input.lowQuantityThreshold,
      availability: input.availability ?? ProductAvailability.AVAILABLE,
      status: input.status ?? ProductStatus.ACTIVE,
      stocks,
      ...prices,
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
    const prices = await this.resolvePrices(input, current);
    const product = await this.productRepository.update({ ...input, ...prices });
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
  /**
   * Refreshes Syrian-pound prices for every product whose calculation switch is on.
   */
  async applyExchangeRate(usdToSyp: string): Promise<void> {
    await this.transactionRunner.run(async (context) => {
      await this.productRepository.recalculateSypPrices(usdToSyp, context);
    });
  }
  private async resolvePrices(input: PriceSelection, current?: ProductEntity): Promise<ResolvedProductPrices> {
    const calculateSypFromRate = input.calculateSypFromRate ?? current?.calculateSypFromRate ?? false;
    const pharmacyPriceUsd = this.readAmount(input.pharmacyPriceUsd ?? current?.pharmacyPriceUsd, 'USD_PRICE_REQUIRED');
    const consumerPriceUsd = this.readAmount(input.consumerPriceUsd ?? current?.consumerPriceUsd, 'USD_PRICE_REQUIRED');
    const invoiceCurrency = input.invoiceCurrency ?? current?.invoiceCurrency ?? InvoiceCurrency.SYP;
    if (calculateSypFromRate) {
      const usdToSyp = await this.exchangeRateService.requireUsdToSyp();
      return {
        pharmacyPriceUsd,
        consumerPriceUsd,
        pharmacyPriceSyp: calculateSypPrice(pharmacyPriceUsd, usdToSyp),
        consumerPriceSyp: calculateSypPrice(consumerPriceUsd, usdToSyp),
        calculateSypFromRate: true,
        invoiceCurrency,
      };
    }
    return {
      pharmacyPriceUsd,
      consumerPriceUsd,
      pharmacyPriceSyp: this.readAmount(input.pharmacyPriceSyp ?? current?.pharmacyPriceSyp, 'SYP_PRICE_REQUIRED'),
      consumerPriceSyp: this.readAmount(input.consumerPriceSyp ?? current?.consumerPriceSyp, 'SYP_PRICE_REQUIRED'),
      calculateSypFromRate: false,
      invoiceCurrency,
    };
  }
  private readAmount(value: string | undefined, code: string): string {
    if (!value || !MONEY_PATTERN.test(value) || Number(value) <= 0) {
      throw new InvalidStateException({ message: 'The price must be greater than zero', code });
    }
    return value;
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
