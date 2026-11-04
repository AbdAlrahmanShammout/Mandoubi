import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowUniqueViolation, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreatePharmacyRepoInput, UpdatePharmacyStatusRepoInput } from '@/modules/pharmacy/defs/pharmacy-repository.defs';
import { PharmacyEntity } from '@/modules/pharmacy/entity/pharmacy.entity';
import { PharmacyMapper } from '@/modules/pharmacy/mapper/pharmacy.mapper';
import { PharmacyRepository } from '@/modules/pharmacy/repository/pharmacy.repository';
import { pharmacyDetailsInclude } from '@/modules/pharmacy/types/pharmacy-details.include';

/**
 * Prisma storage for pharmacy profiles.
 */
@Injectable()
export class PharmacyPrismaRepository extends PharmacyRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one pharmacy profile on the given transaction when one is open. */
  async create(input: CreatePharmacyRepoInput, context?: TransactionContext): Promise<PharmacyEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.pharmacy.create({ data: input, include: pharmacyDetailsInclude });
      return PharmacyMapper.toEntity(result);
    } catch (error) {
      rethrowUniqueViolation(error);
    }
  }
  /** Loads one active pharmacy by id. */
  async findById(id: number): Promise<PharmacyEntity | null> {
    const result = await this.prisma.pharmacy.findFirst({ where: { id, deletedAt: null }, include: pharmacyDetailsInclude });
    return result ? PharmacyMapper.toEntity(result) : null;
  }
  /** Loads one active pharmacy by mobile number. */
  async findByMobileNumber(mobileNumber: string): Promise<PharmacyEntity | null> {
    const result = await this.prisma.pharmacy.findFirst({
      where: { mobileNumber, deletedAt: null },
      include: pharmacyDetailsInclude,
    });
    return result ? PharmacyMapper.toEntity(result) : null;
  }
  /** Updates status on the given transaction and reloads the row with that client. */
  async updateStatus(input: UpdatePharmacyStatusRepoInput, context?: TransactionContext): Promise<PharmacyEntity | null> {
    const client = resolvePrismaClient(this.prisma, context);
    const updated = await client.pharmacy.updateMany({
      where: { id: input.id, deletedAt: null },
      data: { status: input.status },
    });
    if (updated.count === 0) {
      return null;
    }
    const result = await client.pharmacy.findFirst({
      where: { id: input.id, deletedAt: null },
      include: pharmacyDetailsInclude,
    });
    return result ? PharmacyMapper.toEntity(result) : null;
  }
}
