import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { AuditEntryEntity } from '@/modules/audit/entity/audit-entry.entity';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';

/**
 * Change written in the same transaction as the data it describes.
 */
export interface CreateAuditEntryRepoInput {
  readonly actorUserId: number;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly detail: Prisma.InputJsonValue;
}

/**
 * Persistence contract for the append-only audit trail.
 */
export abstract class AuditRepository {
  /** Inserts one audit row. */
  abstract create(input: CreateAuditEntryRepoInput, context?: TransactionContext): Promise<void>;
  /** Lists entries for one resource, oldest first. */
  abstract listByResource(resourceType: string, resourceId: string): Promise<AuditEntryEntity[]>;
}
