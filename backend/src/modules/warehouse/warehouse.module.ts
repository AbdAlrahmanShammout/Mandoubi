import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { WarehousePrismaRepository } from '@/modules/warehouse/repository/warehouse-prisma.repository';
import { WarehouseRepository } from '@/modules/warehouse/repository/warehouse.repository';
import { WarehouseService } from '@/modules/warehouse/warehouse.service';

/**
 * Warehouses. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [WarehouseService, { provide: WarehouseRepository, useClass: WarehousePrismaRepository }],
  exports: [WarehouseService],
})
export class WarehouseModule {}
