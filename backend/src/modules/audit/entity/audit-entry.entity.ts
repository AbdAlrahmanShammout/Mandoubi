import { AuditAction } from '@/modules/audit/enum/audit-action.enum';

/**
 * One recorded change. The row is never updated.
 */
export class AuditEntryEntity {
  id!: number;
  actorUserId!: number;
  action!: AuditAction;
  resourceType!: string;
  resourceId!: string;
  detail!: Record<string, string | number | boolean | null>;
  createdAt!: Date;
  constructor(data: Omit<AuditEntryEntity, 'constructor'>) {
    Object.assign(this, data);
  }
}
