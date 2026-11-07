import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateManufacturerRepoInput, UpdateManufacturerRepoInput, UpdateManufacturerStatusRepoInput } from '@/modules/manufacturer/defs/manufacturer-repository.defs';
import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';
import { ManufacturerMapper } from '@/modules/manufacturer/mapper/manufacturer.mapper';
import { ManufacturerRepository, ManufacturerSearchInput } from '@/modules/manufacturer/repository/manufacturer.repository';
import { manufacturerDetailsInclude } from '@/modules/manufacturer/types/manufacturer-details.include';

function nameConflict(): ConflictException {
  return new ConflictException({
    message: 'A manufacturer with this name already exists',
    code: 'MANUFACTURER_NAME_IN_USE',
  });
}

/**
 * Prisma storage for manufacturers.
 */
@Injectable()
export class ManufacturerPrismaRepository extends ManufacturerRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one manufacturer on the given transaction when one is open. */
  async create(input: CreateManufacturerRepoInput, context?: TransactionContext): Promise<ManufacturerEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.manufacturer.create({ data: input, include: manufacturerDetailsInclude });
      return ManufacturerMapper.toEntity(result);
    } catch (error) {
      rethrowConflict(error, nameConflict());
    }
  }
  /** Loads one manufacturer that has not been removed. */
  async findById(id: number): Promise<ManufacturerEntity | null> {
    const result = await this.prisma.manufacturer.findFirst({ where: { id, deletedAt: null }, include: manufacturerDetailsInclude });
    return result ? ManufacturerMapper.toEntity(result) : null;
  }
  /** Lists manufacturers that have not been removed, oldest first. */
  async list(): Promise<ManufacturerEntity[]> {
    const results = await this.prisma.manufacturer.findMany({
      where: { deletedAt: null },
      include: manufacturerDetailsInclude,
      orderBy: { id: 'asc' },
    });
    return results.map((result) => ManufacturerMapper.toEntity(result));
  }
  /** Searches the manufacturer name, then returns one page. */
  async search(input: ManufacturerSearchInput): Promise<{ readonly items: readonly ManufacturerEntity[]; readonly total: number }> {
    const where: Prisma.ManufacturerWhereInput = {
      deletedAt: null,
      ...(input.status ? { status: input.status } : {}),
      ...(input.search ? { name: { contains: input.search, mode: 'insensitive' } } : {}),
    };
    const [results, total] = await this.prisma.$transaction([
      this.prisma.manufacturer.findMany({
        where,
        include: manufacturerDetailsInclude,
        orderBy: [{ name: 'asc' }, { id: 'asc' }],
        take: input.limit,
        skip: input.offset,
      }),
      this.prisma.manufacturer.count({ where }),
    ]);
    return { items: results.map((result) => ManufacturerMapper.toEntity(result)), total };
  }
  /** Updates the name when the manufacturer is still present. */
  async update(input: UpdateManufacturerRepoInput, context?: TransactionContext): Promise<ManufacturerEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const updated = await client.manufacturer.updateMany({
        where: { id: input.id, deletedAt: null },
        data: this.changedFields(input),
      });
      if (updated.count === 0) {
        return null;
      }
      const result = await client.manufacturer.findFirst({ where: { id: input.id, deletedAt: null }, include: manufacturerDetailsInclude });
      return result ? ManufacturerMapper.toEntity(result) : null;
    } catch (error) {
      rethrowConflict(error, nameConflict());
    }
  }
  /** Updates status when the manufacturer is still present. */
  async updateStatus(input: UpdateManufacturerStatusRepoInput, context?: TransactionContext): Promise<ManufacturerEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.manufacturer.updateMany({
      where: { id: input.id, deletedAt: null },
      data: { status: input.status },
    });
    if (updated.count === 0) {
      return null;
    }
    const result = await client.manufacturer.findFirst({ where: { id: input.id, deletedAt: null }, include: manufacturerDetailsInclude });
    return result ? ManufacturerMapper.toEntity(result) : null;
  }
  private changedFields(input: UpdateManufacturerRepoInput): Prisma.ManufacturerUpdateManyMutationInput {
    return { ...(input.name !== undefined ? { name: input.name } : {}) };
  }
}
