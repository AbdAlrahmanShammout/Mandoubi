import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { DriverPrismaRepository } from '@/modules/driver/repository/driver-prisma.repository';
import { DriverRepository } from '@/modules/driver/repository/driver.repository';
import { DriverService } from '@/modules/driver/driver.service';
import { UserModule } from '@/modules/user/user.module';

/**
 * Driver profiles. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule, UserModule],
  providers: [DriverService, { provide: DriverRepository, useClass: DriverPrismaRepository }],
  exports: [DriverService],
})
export class DriverModule {}
