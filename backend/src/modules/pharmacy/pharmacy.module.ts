import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { PharmacyPrismaRepository } from '@/modules/pharmacy/repository/pharmacy-prisma.repository';
import { PharmacyRepository } from '@/modules/pharmacy/repository/pharmacy.repository';
import { PharmacyService } from '@/modules/pharmacy/pharmacy.service';
import { UserModule } from '@/modules/user/user.module';

/**
 * Pharmacy profiles. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule, UserModule],
  providers: [PharmacyService, { provide: PharmacyRepository, useClass: PharmacyPrismaRepository }],
  exports: [PharmacyService],
})
export class PharmacyModule {}
