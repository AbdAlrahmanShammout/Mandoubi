import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { PrismaTransactionContext } from '@/providers/database/prisma/prisma-transaction-context';

/**
 * Prisma implementation of the shared transaction boundary.
 */
@Injectable()
export class PrismaTransactionRunner extends TransactionRunner {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /**
   * Runs `work` on one Prisma interactive transaction.
   */
  async run<T>(work: (context: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (client) => {
      return work(new PrismaTransactionContext(client));
    });
  }
}
