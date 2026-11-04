import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { CreatePharmacySessionRepoInput } from '@/modules/pharmacy/defs/pharmacy-session.defs';
import { PharmacySessionEntity } from '@/modules/pharmacy/entity/pharmacy-session.entity';
import { PharmacySessionMapper } from '@/modules/pharmacy/mapper/pharmacy-session.mapper';
import { PharmacySessionRepository } from '@/modules/pharmacy/repository/pharmacy-session.repository';
import { pharmacySessionDetailsInclude } from '@/modules/pharmacy/types/pharmacy-session-details.include';

/**
 * Prisma storage for pharmacy sign-in sessions.
 */
@Injectable()
export class PharmacySessionPrismaRepository extends PharmacySessionRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one session on the given transaction when one is open. */
  async create(input: CreatePharmacySessionRepoInput, context?: TransactionContext): Promise<PharmacySessionEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.pharmacySession.create({ data: input, include: pharmacySessionDetailsInclude });
      return PharmacySessionMapper.toEntity(result);
    } catch (error) {
      rethrowActiveSessionConflict(error);
    }
  }
  /** Loads one session by id, including a revoked session. */
  async findById(id: number): Promise<PharmacySessionEntity | null> {
    const result = await this.prisma.pharmacySession.findFirst({ where: { id }, include: pharmacySessionDetailsInclude });
    return result ? PharmacySessionMapper.toEntity(result) : null;
  }
  /** Revokes every session that is still active for the pharmacy. */
  async revokeActiveByPharmacyId(pharmacyId: number, context?: TransactionContext): Promise<void> {
    const client = resolvePrismaClient(this.prisma, context);
    await client.pharmacySession.updateMany({
      where: { pharmacyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}

function rethrowActiveSessionConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException({
      message: 'A pharmacy session is already active',
      code: 'PHARMACY_SESSION_CONFLICT',
    });
  }
  throw error;
}
