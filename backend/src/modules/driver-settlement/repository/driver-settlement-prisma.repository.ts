import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { DriverSettlementEntity } from '@/modules/driver-settlement/entity/driver-settlement.entity';
import { CreateDriverSettlementRepoInput, DriverSettlementRepository } from '@/modules/driver-settlement/repository/driver-settlement.repository';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { formatMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Prisma storage for driver handovers.
 */
@Injectable()
export class DriverSettlementPrismaRepository extends DriverSettlementRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one handover on the given transaction when one is open. */
  async create(input: CreateDriverSettlementRepoInput, context?: TransactionContext): Promise<DriverSettlementEntity> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      const result = await client.driverSettlement.create({
        data: {
          driverId: input.driverId,
          currency: input.currency,
          amount: input.amount,
          receivedByName: input.receivedByName,
          occurredAt: input.occurredAt,
          lines: { create: input.paymentIds.map((paymentId) => ({ paymentId })) },
        },
        include: { lines: true },
      });
      return toEntity(result);
    } catch (error) {
      rethrowConflict(error, alreadySettled());
    }
  }
  /** Lists handovers for one driver, oldest first. */
  async listByDriverId(driverId: number): Promise<DriverSettlementEntity[]> {
    const results = await this.prisma.driverSettlement.findMany({ where: { driverId }, include: { lines: true }, orderBy: { occurredAt: 'asc' } });
    return results.map((result) => toEntity(result));
  }
}

function toEntity(result: Prisma.DriverSettlementGetPayload<{ include: { lines: true } }>): DriverSettlementEntity {
  const settlement = new DriverSettlementEntity({
    id: result.id,
    driverId: result.driverId,
    currency: result.currency as InvoiceCurrency,
    amount: formatMoney(result.amount),
    receivedByName: result.receivedByName,
    occurredAt: result.occurredAt,
    createdAt: result.createdAt,
    updatedAt: result.updatedAt,
  });
  settlement.paymentIds = result.lines.map((line) => line.paymentId);
  return settlement;
}

function alreadySettled(): ConflictException {
  return new ConflictException({ message: 'This collection has already been handed over', code: 'COLLECTION_ALREADY_SETTLED' });
}
