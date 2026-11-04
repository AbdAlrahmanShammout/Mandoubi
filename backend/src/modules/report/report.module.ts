import { Module } from '@nestjs/common';
import { ReportPrismaRepository } from '@/modules/report/repository/report-prisma.repository';
import { ReportRepository } from '@/modules/report/repository/report.repository';
import { ReportService } from '@/modules/report/report.service';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Read-only reports. Controllers are registered by the admin API module.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [ReportService, { provide: ReportRepository, useClass: ReportPrismaRepository }],
  exports: [ReportService],
})
export class ReportModule {}
