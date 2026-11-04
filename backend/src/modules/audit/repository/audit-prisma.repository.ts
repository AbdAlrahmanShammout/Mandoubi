import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransactionContext } from '@/common/base/transaction-context';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { AuditEntryEntity } from '@/modules/audit/entity/audit-entry.entity';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';
import { AuditRepository, CreateAuditEntryRepoInput } from '@/modules/audit/repository/audit.repository';

/**
 * Prisma storage for audit rows.
 */
@Injectable()
export class AuditPrismaRepository extends AuditRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one row on the given transaction when one is open. */
  async create(input: CreateAuditEntryRepoInput, context?: TransactionContext): Promise<void> {
    const client = resolvePrismaClient(this.prisma, context);
    await client.auditEntry.create({ data: input });
  }
  /** Lists entries for one resource, oldest first. */
  async listByResource(resourceType: string, resourceId: string): Promise<AuditEntryEntity[]> {
    const results = await this.prisma.auditEntry.findMany({ where: { resourceType, resourceId }, orderBy: { id: 'asc' } });
    return results.map((result) => toEntity(result));
  }
}

function toEntity(result: { id: number; actorUserId: number; action: string; resourceType: string; resourceId: string; detail: Prisma.JsonValue; createdAt: Date }): AuditEntryEntity {
  return new AuditEntryEntity({
    id: result.id,
    actorUserId: result.actorUserId,
    action: result.action as AuditAction,
    resourceType: result.resourceType,
    resourceId: result.resourceId,
    detail: readDetail(result.detail),
    createdAt: result.createdAt,
  });
}

function readDetail(detail: Prisma.JsonValue): Record<string, string | number | boolean | null> {
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail)) {
    return {};
  }
  return Object.fromEntries(Object.entries(detail).filter((entry): entry is [string, string | number | boolean | null] => isDetailValue(entry[1])));
}

function isDetailValue(value: Prisma.JsonValue | undefined): value is string | number | boolean | null {
  return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}
