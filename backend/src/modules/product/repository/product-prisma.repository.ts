import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateProductRepoInput, UpdateProductRepoInput } from '@/modules/product/defs/product-repository.defs';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { ProductMapper } from '@/modules/product/mapper/product.mapper';
import { ProductRepository } from '@/modules/product/repository/product.repository';
import { calculateSypPrice } from '@/modules/product/helpers/syp-price.helper';
import { productDetailsInclude } from '@/modules/product/types/product-details.include';

/**
 * Prisma storage for products.
 */
@Injectable()
export class ProductPrismaRepository extends ProductRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one product and its stock rows together. */
  async create(input: CreateProductRepoInput, context?: TransactionContext): Promise<ProductEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.product.create({
        data: {
          name: input.name,
          barcode: input.barcode,
          manufacturerId: input.manufacturerId,
          activeIngredient: input.activeIngredient,
          imageUrl: input.imageUrl,
          minimumOrderQuantity: input.minimumOrderQuantity,
          maximumOrderQuantity: input.maximumOrderQuantity,
          lowQuantityThreshold: input.lowQuantityThreshold,
          pharmacyPriceUsd: new Prisma.Decimal(input.pharmacyPriceUsd),
          pharmacyPriceSyp: new Prisma.Decimal(input.pharmacyPriceSyp),
          consumerPriceUsd: new Prisma.Decimal(input.consumerPriceUsd),
          consumerPriceSyp: new Prisma.Decimal(input.consumerPriceSyp),
          calculateSypFromRate: input.calculateSypFromRate,
          invoiceCurrency: input.invoiceCurrency,
          availability: input.availability,
          status: input.status,
          stocks: {
            create: input.stocks.map((stock) => ({
              warehouseId: stock.warehouseId,
              quantity: stock.quantity,
              isPrimary: stock.isPrimary,
            })),
          },
        },
        include: productDetailsInclude,
      });
      return ProductMapper.toEntity(result);
    } catch (error) {
      rethrowConflict(error, conflictForProduct(error));
    }
  }
  /** Loads one product that has not been removed. */
  async findById(id: number): Promise<ProductEntity | null> {
    const result = await this.prisma.product.findFirst({ where: { id, deletedAt: null }, include: productDetailsInclude });
    return result ? ProductMapper.toEntity(result) : null;
  }
  /** Lists products that have not been removed, oldest first. */
  async list(): Promise<ProductEntity[]> {
    const results = await this.prisma.product.findMany({
      where: { deletedAt: null },
      include: productDetailsInclude,
      orderBy: { id: 'asc' },
    });
    return results.map((result) => ProductMapper.toEntity(result));
  }
  /** Updates product fields when the product is still present. */
  async update(input: UpdateProductRepoInput, context?: TransactionContext): Promise<ProductEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const updated = await client.product.updateMany({
        where: { id: input.id, deletedAt: null },
        data: {
          ...(input.name !== undefined ? { name: input.name } : {}),
          ...(input.barcode !== undefined ? { barcode: input.barcode } : {}),
          ...(input.manufacturerId !== undefined ? { manufacturerId: input.manufacturerId } : {}),
          ...(input.activeIngredient !== undefined ? { activeIngredient: input.activeIngredient } : {}),
          ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
          ...(input.minimumOrderQuantity !== undefined ? { minimumOrderQuantity: input.minimumOrderQuantity } : {}),
          ...(input.maximumOrderQuantity !== undefined ? { maximumOrderQuantity: input.maximumOrderQuantity } : {}),
          ...(input.lowQuantityThreshold !== undefined ? { lowQuantityThreshold: input.lowQuantityThreshold } : {}),
          ...priceColumns(input),
          ...(input.availability !== undefined ? { availability: input.availability } : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
        },
      });
      if (updated.count === 0) {
        return null;
      }
      const result = await client.product.findFirst({ where: { id: input.id, deletedAt: null }, include: productDetailsInclude });
      return result ? ProductMapper.toEntity(result) : null;
    } catch (error) {
      rethrowConflict(error, conflictForProduct(error));
    }
  }
  /** Rewrites Syrian-pound prices from the dollar prices and the supplied rate. */
  async recalculateSypPrices(usdToSyp: string, context?: TransactionContext): Promise<void> {
    const client = resolvePrismaClient(this.prisma, context);
    const products = await client.product.findMany({
      where: { deletedAt: null, calculateSypFromRate: true },
      select: { id: true, pharmacyPriceUsd: true, consumerPriceUsd: true },
    });
    for (const product of products) {
      await client.product.update({
        where: { id: product.id },
        data: {
          pharmacyPriceSyp: new Prisma.Decimal(calculateSypPrice(product.pharmacyPriceUsd.toString(), usdToSyp)),
          consumerPriceSyp: new Prisma.Decimal(calculateSypPrice(product.consumerPriceUsd.toString(), usdToSyp)),
        },
      });
    }
  }
}

function priceColumns(input: {
  pharmacyPriceUsd?: string;
  pharmacyPriceSyp?: string;
  consumerPriceUsd?: string;
  consumerPriceSyp?: string;
  calculateSypFromRate?: boolean;
  invoiceCurrency?: UpdateProductRepoInput['invoiceCurrency'];
}): Prisma.ProductUpdateManyMutationInput {
  return {
    ...(input.pharmacyPriceUsd !== undefined ? { pharmacyPriceUsd: new Prisma.Decimal(input.pharmacyPriceUsd) } : {}),
    ...(input.pharmacyPriceSyp !== undefined ? { pharmacyPriceSyp: new Prisma.Decimal(input.pharmacyPriceSyp) } : {}),
    ...(input.consumerPriceUsd !== undefined ? { consumerPriceUsd: new Prisma.Decimal(input.consumerPriceUsd) } : {}),
    ...(input.consumerPriceSyp !== undefined ? { consumerPriceSyp: new Prisma.Decimal(input.consumerPriceSyp) } : {}),
    ...(input.calculateSypFromRate !== undefined ? { calculateSypFromRate: input.calculateSypFromRate } : {}),
    ...(input.invoiceCurrency !== undefined ? { invoiceCurrency: input.invoiceCurrency } : {}),
  };
}

function conflictForProduct(error: unknown): ConflictException {
  const target = error instanceof Prisma.PrismaClientKnownRequestError ? uniqueTarget(error) : '';
  if (target.includes('warehouse')) {
    return new ConflictException({
      message: 'A product cannot be linked to the same warehouse twice',
      code: 'WAREHOUSE_LINK_DUPLICATED',
    });
  }
  return new ConflictException({
    message: 'A product with this barcode already exists',
    code: 'BARCODE_IN_USE',
  });
}

function uniqueTarget(error: Prisma.PrismaClientKnownRequestError): string {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.join(',');
  }
  return typeof target === 'string' ? target : '';
}
