import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { PharmacySessionPrismaRepository } from '@/modules/pharmacy/repository/pharmacy-session-prisma.repository';
import { PharmacySessionRepository } from '@/modules/pharmacy/repository/pharmacy-session.repository';
import { PharmacyPrismaRepository } from '@/modules/pharmacy/repository/pharmacy-prisma.repository';
import { PharmacyRepository } from '@/modules/pharmacy/repository/pharmacy.repository';
import { PharmacySessionService } from '@/modules/pharmacy/pharmacy-session.service';
import { PharmacyService } from '@/modules/pharmacy/pharmacy.service';
import { UserModule } from '@/modules/user/user.module';

/**
 * Pharmacy profiles and their sign-in sessions. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule, UserModule],
  providers: [
    PharmacyService,
    PharmacySessionService,
    { provide: PharmacyRepository, useClass: PharmacyPrismaRepository },
    { provide: PharmacySessionRepository, useClass: PharmacySessionPrismaRepository },
  ],
  exports: [PharmacyService, PharmacySessionService],
})
export class PharmacyModule {}
