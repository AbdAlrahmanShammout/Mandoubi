import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateOrderRepoInput } from '@/modules/order/defs/order-repository.defs';
import { OrderEntity } from '@/modules/order/entity/order.entity';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { matchesOrderList } from '@/modules/order/helpers/matches-order-list.helper';
import { OrderMapper } from '@/modules/order/mapper/order.mapper';
import { OrderRepository, OrderSearchInput } from '@/modules/order/repository/order.repository';
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
  /** Searches the order number and pharmacy name, then returns one page. */
  async search(input: OrderSearchInput): Promise<{ readonly items: readonly OrderEntity[]; readonly total: number }> {
    const stubs = await this.prisma.order.findMany({
      where: createdRange(input.createdFrom, input.createdTo),
      select: { id: true, pharmacy: { select: { name: true } }, invoices: { select: { status: true } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
    const matched = stubs.filter((order) => matchesOrderList({
      id: order.id,
      pharmacyName: order.pharmacy.name,
      invoiceStatuses: order.invoices.map((invoice) => invoice.status as InvoiceStatus),
    }, input));
    const page = matched.slice(input.offset, input.offset + input.limit);
    if (page.length === 0) {
      return { items: [], total: matched.length };
    }
    const details = await this.prisma.order.findMany({
      where: { id: { in: page.map((order) => order.id) } },
      include: orderDetailsInclude,
    });
    const byId = new Map(details.map((order) => [order.id, order]));
    return {
      items: page.flatMap((order) => {
        const detail = byId.get(order.id);
        return detail ? [OrderMapper.toEntity(detail)] : [];
      }),
      total: matched.length,
    };
  }
  /** Lists the orders submitted by one pharmacy, oldest first. */
  async listByPharmacyId(pharmacyId: number): Promise<OrderEntity[]> {
    const results = await this.prisma.order.findMany({ where: { pharmacyId }, include: orderDetailsInclude, orderBy: { id: 'asc' } });
    return results.map((result) => OrderMapper.toEntity(result));
  }
}

function createdRange(createdFrom?: Date, createdTo?: Date): { createdAt?: { gte?: Date; lte?: Date } } {
  if (!createdFrom && !createdTo) {
    return {};
  }
  return {
    createdAt: {
      ...(createdFrom ? { gte: createdFrom } : {}),
      ...(createdTo ? { lte: createdTo } : {}),
    },
  };
}
