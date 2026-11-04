import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowUniqueViolation, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateDriverRepoInput, UpdateDriverStatusRepoInput } from '@/modules/driver/defs/driver-repository.defs';
import { DriverEntity } from '@/modules/driver/entity/driver.entity';
import { DriverMapper } from '@/modules/driver/mapper/driver.mapper';
import { DriverRepository } from '@/modules/driver/repository/driver.repository';
import { driverDetailsInclude } from '@/modules/driver/types/driver-details.include';

/**
 * Prisma storage for driver profiles.
 */
@Injectable()
export class DriverPrismaRepository extends DriverRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one driver profile on the given transaction when one is open. */
  async create(input: CreateDriverRepoInput, context?: TransactionContext): Promise<DriverEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.driver.create({ data: input, include: driverDetailsInclude });
      return DriverMapper.toEntity(result);
    } catch (error) {
      rethrowUniqueViolation(error);
    }
  }
  /** Loads one active driver by id. */
  async findById(id: number): Promise<DriverEntity | null> {
    const result = await this.prisma.driver.findFirst({ where: { id, deletedAt: null }, include: driverDetailsInclude });
    return result ? DriverMapper.toEntity(result) : null;
  }
  /** Loads one active driver by mobile number. */
  async findByMobileNumber(mobileNumber: string): Promise<DriverEntity | null> {
    const result = await this.prisma.driver.findFirst({
      where: { mobileNumber, deletedAt: null },
      include: driverDetailsInclude,
    });
    return result ? DriverMapper.toEntity(result) : null;
  }
  /** Updates status on the given transaction and reloads the row with that client. */
  async updateStatus(input: UpdateDriverStatusRepoInput, context?: TransactionContext): Promise<DriverEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.driver.updateMany({
      where: { id: input.id, deletedAt: null },
      data: { status: input.status },
    });
    if (updated.count === 0) {
      return null;
    }
    const result = await client.driver.findFirst({
      where: { id: input.id, deletedAt: null },
      include: driverDetailsInclude,
    });
    return result ? DriverMapper.toEntity(result) : null;
  }
}
