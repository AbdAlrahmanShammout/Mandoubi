import { ApiProperty } from '@nestjs/swagger';
import { AuditEntryEntity } from '@/modules/audit/entity/audit-entry.entity';
import { AuditAction } from '@/modules/audit/enum/audit-action.enum';

/**
 * One append-only audit row.
 */
export class AuditEntryResponse {
  @ApiProperty({ example: 1 })
  readonly id: number;
  @ApiProperty({ example: 1 })
  readonly actorUserId: number;
  @ApiProperty({ enum: AuditAction, example: AuditAction.INVOICE_STATUS_CHANGED })
  readonly action: AuditAction;
  @ApiProperty({ example: 'invoice' })
  readonly resourceType: string;
  @ApiProperty({ example: '1' })
  readonly resourceId: string;
  @ApiProperty({ example: { from: 'ASSIGNED', to: 'DELIVERED_UNPAID' } })
  readonly detail: Record<string, string | number | boolean | null>;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly createdAt: Date;
  constructor(entry: AuditEntryEntity) {
    this.id = entry.id;
    this.actorUserId = entry.actorUserId;
    this.action = entry.action;
    this.resourceType = entry.resourceType;
    this.resourceId = entry.resourceId;
    this.detail = entry.detail;
    this.createdAt = entry.createdAt;
  }
}
