import { Global, Module } from '@nestjs/common';
import { TransactionRunner } from '@/common/base/transaction-runner';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { PrismaTransactionRunner } from '@/providers/database/prisma/prisma-transaction-runner';

/**
 * Global database client. Repositories are its only intended consumers.
 */
@Global()
@Module({
  providers: [
    PrismaProviderService,
    { provide: TransactionRunner, useClass: PrismaTransactionRunner },
  ],
  exports: [PrismaProviderService, TransactionRunner],
})
export class PrismaProviderModule {}
