import { Module } from '@nestjs/common';
import { AuditService } from '@/modules/audit/audit.service';
import { AuditPrismaRepository } from '@/modules/audit/repository/audit-prisma.repository';
import { AuditRepository } from '@/modules/audit/repository/audit.repository';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Append-only audit trail. It imports no domain module.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [AuditService, { provide: AuditRepository, useClass: AuditPrismaRepository }],
  exports: [AuditService],
})
export class AuditModule {}
