import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateOrderRepoInput } from '@/modules/order/defs/order-repository.defs';
import { OrderEntity } from '@/modules/order/entity/order.entity';
import { OrderMapper } from '@/modules/order/mapper/order.mapper';
import { OrderRepository } from '@/modules/order/repository/order.repository';
import { orderDetailsInclude } from '@/modules/order/types/order-details.include';

/**
 * Prisma storage for parent orders.
 */
@Injectable()
export class OrderPrismaRepository extends OrderRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one order on the given transaction when one is open. */
  async create(input: CreateOrderRepoInput, context?: TransactionContext): Promise<OrderEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.order.create({ data: { pharmacyId: input.pharmacyId }, include: orderDetailsInclude });
    return OrderMapper.toEntity(result);
  }
  /** Loads one order with its pharmacy and invoices. */
  async findById(id: number): Promise<OrderEntity | null> {
    const result = await this.prisma.order.findUnique({ where: { id }, include: orderDetailsInclude });
    return result ? OrderMapper.toEntity(result) : null;
  }
  /** Lists every order, oldest first. */
  async list(): Promise<OrderEntity[]> {
    const results = await this.prisma.order.findMany({ include: orderDetailsInclude, orderBy: { id: 'asc' } });
    return results.map((result) => OrderMapper.toEntity(result));
  }
  /** Lists the orders submitted by one pharmacy, oldest first. */
  async listByPharmacyId(pharmacyId: number): Promise<OrderEntity[]> {
    const results = await this.prisma.order.findMany({ where: { pharmacyId }, include: orderDetailsInclude, orderBy: { id: 'asc' } });
    return results.map((result) => OrderMapper.toEntity(result));
  }
}
