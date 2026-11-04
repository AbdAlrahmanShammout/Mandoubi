import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { ManufacturerPrismaRepository } from '@/modules/manufacturer/repository/manufacturer-prisma.repository';
import { ManufacturerRepository } from '@/modules/manufacturer/repository/manufacturer.repository';
import { ManufacturerService } from '@/modules/manufacturer/manufacturer.service';

/**
 * Manufacturers. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [ManufacturerService, { provide: ManufacturerRepository, useClass: ManufacturerPrismaRepository }],
  exports: [ManufacturerService],
})
export class ManufacturerModule {}
