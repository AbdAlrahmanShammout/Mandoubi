import { Injectable } from '@nestjs/common';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { TransactionContext } from '@/common/base/transaction-context';
import { rethrowConflict, resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { ReturnRecordRepository } from '@/modules/return-record/repository/return-record.repository';

/**
 * Prisma storage for invoice returns.
 */
@Injectable()
export class ReturnRecordPrismaRepository extends ReturnRecordRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one return on the open transaction. */
  async create(invoiceId: number, context: TransactionContext): Promise<void> {
    const client = resolvePrismaClient(this.prisma, context);
    try {
      await client.returnRecord.create({ data: { invoiceId } });
    } catch (error) {
      rethrowConflict(error, alreadyReturned());
    }
  }
}

function alreadyReturned(): ConflictException {
  return new ConflictException({ message: 'This invoice has already been returned to the warehouse', code: 'RETURN_ALREADY_RECORDED' });
}
