import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditService } from '@/modules/audit/audit.service';
import { ExchangeRateService } from '@/modules/exchange-rate/exchange-rate.service';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ManufacturerService } from '@/modules/manufacturer/manufacturer.service';
import { MONEY_PATTERN } from '@/modules/product/constants/money.constant';
import { CreateProductRepoInput, ResolvedProductPrices, UpdateProductRepoInput } from '@/modules/product/defs/product-repository.defs';
import { Page, normalizePage } from '@/common/paging/page';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { PharmacyCatalogSearchInput, ProductSearchInput } from '@/modules/product/repository/product.repository';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { ProductStockSelection, assertOrderLimits, normalizeProductStocks } from '@/modules/product/helpers/normalize-product-stocks.helper';
import { preserveReservedStock } from '@/modules/product/helpers/preserve-reserved-stock.helper';
import { OfferSelection, resolveProductOffer } from '@/modules/product/helpers/product-offer.helper';
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

interface OfferRequest {
  readonly offerActive?: boolean;
  readonly offerPaidUnits?: number;
  readonly offerFreeUnits?: number;
  readonly offerStartsAt?: string;
  readonly offerEndsAt?: string;
}

interface CreateProductServiceInput extends Omit<CreateProductRepoInput, 'stocks' | 'availability' | 'status' | 'imageUrl' | keyof ResolvedProductPrices | keyof OfferSelection>, PriceSelection, OfferRequest {
  readonly imageUrl?: string | null;
  readonly availability?: ProductAvailability;
  readonly status?: ProductStatus;
  readonly stocks: readonly ProductStockSelection[];
}

interface UpdateProductServiceInput extends Omit<UpdateProductRepoInput, keyof OfferSelection>, OfferRequest {}

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
    private readonly auditService: AuditService,
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
    const offer = resolveProductOffer(this.readOffer(input));
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
      category: input.category,
      saleUnit: input.saleUnit,
      stocks,
      ...prices,
      ...offer,
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
   * Searches products on the server and returns one page plus the match count.
   */
  async searchProducts(input: Omit<ProductSearchInput, 'limit' | 'offset'> & { readonly limit?: number; readonly offset?: number }): Promise<Page<ProductEntity>> {
    const page = normalizePage(input.limit, input.offset);
    const result = await this.productRepository.search({ ...input, ...page });
    return { ...result, ...page };
  }
  /**
   * Searches the pharmacy catalog. Disabled products are omitted and the page is sorted by name.
   */
  async searchCatalog(input: Omit<PharmacyCatalogSearchInput, 'limit' | 'offset'> & { readonly limit?: number; readonly offset?: number }): Promise<Page<ProductEntity>> {
    const page = normalizePage(input.limit, input.offset);
    const result = await this.productRepository.searchCatalog({ search: input.search, category: input.category, ...page });
    return { ...result, ...page };
  }
  /**
   * Loads products by id. Removed products are omitted.
   */
  async listProductsByIds(ids: readonly number[]): Promise<ProductEntity[]> {
    if (ids.length === 0) {
      return [];
    }
    return this.productRepository.listByIds(ids);
  }
  /**
   * Changes product data without changing warehouse quantities.
   */
  async updateProduct(input: UpdateProductServiceInput): Promise<ProductEntity> {
    const current = await this.getProductById(input.id);
    assertOrderLimits(input.minimumOrderQuantity ?? current.minimumOrderQuantity, input.maximumOrderQuantity ?? current.maximumOrderQuantity);
    if (input.manufacturerId !== undefined) {
      await this.assertManufacturerActive(input.manufacturerId);
    }
    const prices = await this.resolvePrices(input, current);
    const offer = resolveProductOffer(this.readOffer(input), current);
    const { offerActive, offerPaidUnits, offerFreeUnits, offerStartsAt, offerEndsAt, ...productFields } = input;
    void offerActive;
    void offerPaidUnits;
    void offerFreeUnits;
    void offerStartsAt;
    void offerEndsAt;
    const product = await this.productRepository.update({ ...productFields, ...prices, ...offer });
    if (!product) {
      throw new ResourceNotFoundException('Product', input.id);
    }
    return product;
  }
  /**
   * Replaces the warehouse links. A lone warehouse is stored as primary.
   */
  async replaceStocks(productId: number, selections: readonly ProductStockSelection[], actorUserId: number): Promise<ProductEntity> {
    await this.getProductById(productId);
    const stocks = normalizeProductStocks(selections);
    await this.assertWarehousesExist(stocks);
    await this.transactionRunner.run(async (context) => {
      const current = await this.productStockRepository.listReservations(productId, context);
      const preserved = preserveReservedStock(current, stocks);
      await this.productStockRepository.replaceForProduct({ productId, stocks: preserved }, context);
      await this.auditService.record({
        actorUserId,
        action: AuditAction.STOCK_QUANTITY_CHANGED,
        resourceType: 'product',
        resourceId: String(productId),
        detail: { productId, warehouses: preserved.map((stock) => `${stock.warehouseId}:${stock.quantity}`).join(',') },
      }, context);
    });
    return this.getProductById(productId);
  }
  /**
   * Sets one warehouse quantity and leaves the other warehouses unchanged.
   */
  async updateStockQuantity(productId: number, warehouseId: number, quantity: number, actorUserId: number): Promise<ProductEntity> {
    const current = await this.getProductById(productId);
    const previous = readStockQuantity(current, warehouseId);
    await this.transactionRunner.run(async (context) => {
      const updated = await this.productStockRepository.updateQuantity({ productId, warehouseId, quantity }, context);
      if (updated === 'missing') {
        throw new ResourceNotFoundException('Product stock', `${productId}:${warehouseId}`);
      }
      if (updated === 'locked') {
        throw new InvalidStateException({ message: 'Physical quantity cannot fall below the reserved quantity', code: 'RESERVED_STOCK_LOCKED' });
      }
      await this.auditService.record({
        actorUserId,
        action: AuditAction.STOCK_QUANTITY_CHANGED,
        resourceType: 'product',
        resourceId: String(productId),
        detail: { productId, warehouseId, from: previous, to: quantity },
      }, context);
    });
    return this.getProductById(productId);
  }
  /**
   * Reserves stock from the warehouse stored on an invoice. Physical quantity stays unchanged.
   */
  async reserveRecordedStock(input: { readonly productId: number; readonly warehouseId: number; readonly quantity: number }, context: TransactionContext): Promise<void> {
    const reserved = await this.productStockRepository.reserve(input, context);
    if (!reserved) {
      throw new InvalidStateException({ message: 'The recorded primary warehouse does not have enough available quantity', code: 'INSUFFICIENT_STOCK' });
    }
  }
  /**
   * Issues stock that was reserved for an invoice. Available quantity does not change.
   */
  async issueRecordedStock(input: { readonly productId: number; readonly warehouseId: number; readonly quantity: number }, context: TransactionContext): Promise<void> {
    const issued = await this.productStockRepository.issue(input, context);
    if (!issued) {
      throw new InvalidStateException({ message: 'The reserved quantity is no longer on the recorded warehouse', code: 'RESERVED_STOCK_MISSING' });
    }
  }
  /**
   * Releases a reservation that was never issued. Physical quantity stays unchanged.
   */
  async releaseRecordedStock(input: { readonly productId: number; readonly warehouseId: number; readonly quantity: number }, context: TransactionContext): Promise<void> {
    const released = await this.productStockRepository.release(input, context);
    if (!released) {
      throw new InvalidStateException({ message: 'The reserved quantity is no longer on the recorded warehouse', code: 'RESERVED_STOCK_MISSING' });
    }
  }
  /**
   * Adds quantity once to the warehouse stored on the invoice.
   */
  async restockRecordedStock(input: { readonly productId: number; readonly warehouseId: number; readonly quantity: number }, context: TransactionContext): Promise<void> {
    const restocked = await this.productStockRepository.restock(input, context);
    if (!restocked) {
      throw new InvalidStateException({ message: 'The warehouse stored on the invoice no longer holds this product', code: 'STOCK_WAREHOUSE_MISSING' });
    }
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
  private readOffer(input: OfferRequest): OfferSelection {
    return {
      offerActive: input.offerActive,
      offerPaidUnits: input.offerPaidUnits,
      offerFreeUnits: input.offerFreeUnits,
      offerStartsAt: input.offerStartsAt === undefined ? undefined : this.readOfferDate(input.offerStartsAt),
      offerEndsAt: input.offerEndsAt === undefined ? undefined : this.readOfferDate(input.offerEndsAt),
    };
  }
  private readOfferDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new InvalidStateException({ message: 'The offer date is invalid', code: 'OFFER_INVALID' });
    }
    return date;
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

function readStockQuantity(product: ProductEntity, warehouseId: number): number {
  const stock = product.stocks?.find((item) => item.warehouseId === warehouseId);
  if (!stock) {
    throw new ResourceNotFoundException('Product stock', `${product.id}:${warehouseId}`);
  }
  return stock.quantity;
}
