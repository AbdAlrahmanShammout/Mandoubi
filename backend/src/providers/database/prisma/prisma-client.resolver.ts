import { Prisma } from '@prisma/client';
import { ConflictException } from '@/common/exceptions/conflict.exception';
import { InternalException } from '@/common/exceptions/internal.exception';
import { TransactionContext } from '@/common/base/transaction-context';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { PrismaTransactionContext } from '@/providers/database/prisma/prisma-transaction-context';

/** Client that can run statements inside or outside a transaction. */
export type PrismaExecutor = PrismaProviderService | Prisma.TransactionClient;

/**
 * Uses the transaction client when a context is present, otherwise the root client.
 */
export function resolvePrismaClient(prisma: PrismaProviderService, context?: TransactionContext): PrismaExecutor {
  if (!context) {
    return prisma;
  }
  if (context instanceof PrismaTransactionContext) {
    return context.client;
  }
  throw new InternalException('The transaction context is not a database transaction');
}

/**
 * Turns a unique-constraint failure into the conflict the caller describes.
 */
export function rethrowConflict(error: unknown, conflict: ConflictException): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw conflict;
  }
  throw error;
}

/**
 * Turns a unique-constraint failure into a mobile-number conflict.
 */
export function rethrowUniqueViolation(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    throw new ConflictException({
      message: 'An account with this mobile number already exists',
      code: 'MOBILE_NUMBER_IN_USE',
    });
  }
  throw error;
}
