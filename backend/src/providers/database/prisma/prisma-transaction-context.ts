import type { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';

/**
 * Provider-owned transaction handle. Domain code receives it only as {@link TransactionContext}.
 */
export class PrismaTransactionContext extends TransactionContext {
  constructor(readonly client: Prisma.TransactionClient) {
    super();
  }
}
