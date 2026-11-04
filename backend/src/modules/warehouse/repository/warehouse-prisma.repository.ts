import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateWarehouseRepoInput, UpdateWarehouseRepoInput } from '@/modules/warehouse/defs/warehouse-repository.defs';
import { WarehouseEntity } from '@/modules/warehouse/entity/warehouse.entity';
import { WarehouseMapper } from '@/modules/warehouse/mapper/warehouse.mapper';
import { WarehouseRepository } from '@/modules/warehouse/repository/warehouse.repository';
import { warehouseDetailsInclude } from '@/modules/warehouse/types/warehouse-details.include';

/**
 * Prisma storage for warehouses.
 */
@Injectable()
export class WarehousePrismaRepository extends WarehouseRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one warehouse on the given transaction when one is open. */
  async create(input: CreateWarehouseRepoInput, context?: TransactionContext): Promise<WarehouseEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.warehouse.create({ data: input, include: warehouseDetailsInclude });
      return WarehouseMapper.toEntity(result);
    } catch (error) {
      rethrowConflict(error, nameConflict());
    }
  }
  /** Loads one warehouse that has not been removed. */
  async findById(id: number): Promise<WarehouseEntity | null> {
    const result = await this.prisma.warehouse.findFirst({ where: { id, deletedAt: null }, include: warehouseDetailsInclude });
    return result ? WarehouseMapper.toEntity(result) : null;
  }
  /** Lists warehouses that have not been removed, oldest first. */
  async list(): Promise<WarehouseEntity[]> {
    const results = await this.prisma.warehouse.findMany({
      where: { deletedAt: null },
      include: warehouseDetailsInclude,
      orderBy: { id: 'asc' },
    });
    return results.map((result) => WarehouseMapper.toEntity(result));
  }
  /** Updates name or address when the warehouse is still present. */
  async update(input: UpdateWarehouseRepoInput, context?: TransactionContext): Promise<WarehouseEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const updated = await client.warehouse.updateMany({
        where: { id: input.id, deletedAt: null },
        data: this.changedFields(input),
      });
      if (updated.count === 0) {
        return null;
      }
      const result = await client.warehouse.findFirst({ where: { id: input.id, deletedAt: null }, include: warehouseDetailsInclude });
      return result ? WarehouseMapper.toEntity(result) : null;
    } catch (error) {
      rethrowConflict(error, nameConflict());
    }
  }
  private changedFields(input: UpdateWarehouseRepoInput): Prisma.WarehouseUpdateManyMutationInput {
    return {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
    };
  }
}

function nameConflict(): ConflictException {
  return new ConflictException({
    message: 'A warehouse with this name already exists',
    code: 'WAREHOUSE_NAME_IN_USE',
  });
}
