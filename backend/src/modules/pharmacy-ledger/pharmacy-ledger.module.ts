import { Module } from '@nestjs/common';
import { PharmacyLedgerPrismaRepository } from '@/modules/pharmacy-ledger/repository/pharmacy-ledger-prisma.repository';
import { PharmacyLedgerRepository } from '@/modules/pharmacy-ledger/repository/pharmacy-ledger.repository';
import { PharmacyLedgerService } from '@/modules/pharmacy-ledger/pharmacy-ledger.service';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Pharmacy account statements. Controllers are registered by the admin API module.
 */
@Module({
  imports: [DatabaseProviderModule, PharmacyModule],
  providers: [PharmacyLedgerService, { provide: PharmacyLedgerRepository, useClass: PharmacyLedgerPrismaRepository }],
  exports: [PharmacyLedgerService],
})
export class PharmacyLedgerModule {}
