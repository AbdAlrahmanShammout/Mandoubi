import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowUniqueViolation, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreateUserRepoInput, UpdateUserStatusByDriverRepoInput, UpdateUserStatusByPharmacyRepoInput } from '@/modules/user/defs/user-repository.defs';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { UserMapper } from '@/modules/user/mapper/user.mapper';
import { UserRepository } from '@/modules/user/repository/user.repository';
import { userDetailsInclude } from '@/modules/user/types/user-details.include';

/**
 * Prisma storage for credential accounts.
 */
@Injectable()
export class UserPrismaRepository extends UserRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /**
   * Inserts one credential on the given transaction when one is open.
   */
  async create(input: CreateUserRepoInput, context?: TransactionContext): Promise<UserEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.user.create({
        data: {
          role: input.role,
          mobileNumber: input.mobileNumber,
          passwordHash: input.passwordHash,
          status: input.status,
          pharmacyId: input.pharmacyId,
          driverId: input.driverId,
        },
        include: userDetailsInclude,
      });
      return UserMapper.toEntity(result);
    } catch (error) {
      rethrowUniqueViolation(error);
    }
  }
  /**
   * Loads one active credential by id.
   */
  async findById(id: number): Promise<UserEntity | null> {
    const result = await this.prisma.user.findFirst({ where: { id, deletedAt: null }, include: userDetailsInclude });
    return result ? UserMapper.toEntity(result) : null;
  }
  /**
   * Loads one active credential by mobile number.
   */
  async findByMobileNumber(mobileNumber: string): Promise<UserEntity | null> {
    const result = await this.prisma.user.findFirst({
      where: { mobileNumber, deletedAt: null },
      include: userDetailsInclude,
    });
    return result ? UserMapper.toEntity(result) : null;
  }
  /**
   * Updates the pharmacy credential status inside the given transaction.
   */
  async updateStatusByPharmacyId(input: UpdateUserStatusByPharmacyRepoInput, context?: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.user.updateMany({
      where: { pharmacyId: input.pharmacyId, deletedAt: null },
      data: { status: input.status },
    });
    return result.count > 0;
  }
  /**
   * Updates the driver credential status inside the given transaction.
   */
  async updateStatusByDriverId(input: UpdateUserStatusByDriverRepoInput, context?: TransactionContext): Promise<boolean> {
    const client = resolvePrismaClient(this.prisma, context);
    const result = await client.user.updateMany({
      where: { driverId: input.driverId, deletedAt: null },
      data: { status: input.status },
    });
    return result.count > 0;
  }
}
