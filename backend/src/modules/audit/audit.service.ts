import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { AuditEntryEntity } from '@/modules/audit/entity/audit-entry.entity';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditRepository } from '@/modules/audit/repository/audit.repository';

/**
 * Change stored beside the stock, invoice, or payment it describes.
 */
export interface RecordAuditInput {
  readonly actorUserId: number;
  readonly action: AuditAction;
  readonly resourceType: string;
  readonly resourceId: string;
  readonly detail: Prisma.InputJsonValue;
}

/**
 * Writes and reads the append-only audit trail.
 */
@Injectable()
export class AuditService {
  constructor(private readonly auditRepository: AuditRepository) {}
  /**
   * Stores one change. Pass the open transaction so the audit row commits with it.
   */
  async record(input: RecordAuditInput, context?: TransactionContext): Promise<void> {
    await this.auditRepository.create(input, context);
  }
  /**
   * Lists the changes recorded for one resource, oldest first.
   */
  async listByResource(resourceType: string, resourceId: string): Promise<AuditEntryEntity[]> {
    return this.auditRepository.listByResource(resourceType, resourceId);
  }
}
