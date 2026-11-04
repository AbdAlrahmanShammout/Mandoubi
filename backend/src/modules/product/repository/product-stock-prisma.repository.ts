import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { ChangePrimaryWarehouseRepoInput, ProductStockReservation, ReplaceProductStocksRepoInput, ReserveProductStockRepoInput, StockQuantityUpdateResult, UpdateProductStockQuantityRepoInput } from '@/modules/product/defs/product-stock-repository.defs';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';
import { ProductMapper } from '@/modules/product/mapper/product.mapper';
import { ProductStockMapper } from '@/modules/product/mapper/product-stock.mapper';
import { ProductStockRepository } from '@/modules/product/repository/product-stock.repository';
import { warehouseStockInclude } from '@/modules/product/types/product-details.include';

/**
 * Prisma storage for product quantities.
 */
@Injectable()
export class ProductStockPrismaRepository extends ProductStockRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Deletes the current links and writes the replacement set. */
  async replaceForProduct(input: ReplaceProductStocksRepoInput, context?: TransactionContext): Promise<void> {
    const client = resolvePrismaClient(this.prisma, context);
    await client.productStock.deleteMany({ where: { productId: input.productId } });
    await client.productStock.createMany({
      data: input.stocks.map((stock) => ({
        productId: input.productId,
        warehouseId: stock.warehouseId,
        quantity: stock.quantity,
        reservedQuantity: stock.reservedQuantity,
        isPrimary: stock.isPrimary,
      })),
    });
  }
  /** Updates one warehouse quantity when the new physical quantity still covers what is reserved. */
  async updateQuantity(input: UpdateProductStockQuantityRepoInput, context?: TransactionContext): Promise<StockQuantityUpdateResult> {
    const client = resolvePrismaClient(this.prisma, context);
    const existing = await client.productStock.findFirst({
      where: { productId: input.productId, warehouseId: input.warehouseId, product: { deletedAt: null } },
    });
    if (!existing) {
      return 'missing';
    }
    if (existing.reservedQuantity > input.quantity) {
      return 'locked';
    }
    const updated = await client.productStock.updateMany({
      where: { id: existing.id, reservedQuantity: { lte: input.quantity } },
      data: { quantity: input.quantity },
    });
    return updated.count === 1 ? 'updated' : 'locked';
  }
  /** Clears the primary flag, then sets it on the requested warehouse. */
  async changePrimary(input: ChangePrimaryWarehouseRepoInput, context?: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const linked = await client.productStock.findFirst({
      where: { productId: input.productId, warehouseId: input.warehouseId, product: { deletedAt: null } },
    });
    if (!linked) {
      return false;
    }
    await client.productStock.updateMany({ where: { productId: input.productId }, data: { isPrimary: false } });
    await client.productStock.updateMany({ where: { id: linked.id }, data: { isPrimary: true } });
    return true;
  }
  /** Lists quantities stored in one warehouse. */
  async listByWarehouseId(warehouseId: number): Promise<ProductStockEntity[]> {
    const results = await this.prisma.productStock.findMany({
      where: { warehouseId, product: { deletedAt: null } },
      include: warehouseStockInclude,
      orderBy: { productId: 'asc' },
    });
    return results.map((result) => {
      const stock = ProductStockMapper.toEntity(result);
      stock.product = ProductMapper.toEntity(result.product);
      return stock;
    });
  }
  /** Lists reserved quantities for one product. */
  async listReservations(productId: number, context?: TransactionContext): Promise<ProductStockReservation[]> {
    const client = resolvePrismaClient(this.prisma, context);
    const results = await client.productStock.findMany({ where: { productId }, orderBy: { warehouseId: 'asc' } });
    return results.map((result) => ({ warehouseId: result.warehouseId, reservedQuantity: result.reservedQuantity }));
  }
  /** Reserves quantity from one warehouse when available stock covers it. */
  async reserve(input: ReserveProductStockRepoInput, context?: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.$executeRaw`
      UPDATE "product_stocks"
      SET "reserved_quantity" = "reserved_quantity" + ${input.quantity},
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "product_id" = ${input.productId}
        AND "warehouse_id" = ${input.warehouseId}
        AND "quantity" - "reserved_quantity" >= ${input.quantity}
    `;
    return updated === 1;
  }
  /** Issues reserved quantity from the warehouse stored on the invoice. */
  async issue(input: ReserveProductStockRepoInput, context?: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.$executeRaw`
      UPDATE "product_stocks"
      SET "quantity" = "quantity" - ${input.quantity},
          "reserved_quantity" = "reserved_quantity" - ${input.quantity},
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "product_id" = ${input.productId}
        AND "warehouse_id" = ${input.warehouseId}
        AND "reserved_quantity" >= ${input.quantity}
        AND "quantity" >= ${input.quantity}
    `;
    return updated === 1;
  }
}
