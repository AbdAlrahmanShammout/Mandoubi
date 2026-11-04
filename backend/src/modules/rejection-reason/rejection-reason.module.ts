import { Module } from '@nestjs/common';
import { RejectionReasonPrismaRepository } from '@/modules/rejection-reason/repository/rejection-reason-prisma.repository';
import { RejectionReasonRepository } from '@/modules/rejection-reason/repository/rejection-reason.repository';
import { RejectionReasonService } from '@/modules/rejection-reason/rejection-reason.service';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Managed rejection reasons. Controllers are registered by the admin API module.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [RejectionReasonService, { provide: RejectionReasonRepository, useClass: RejectionReasonPrismaRepository }],
  exports: [RejectionReasonService],
})
export class RejectionReasonModule {}
