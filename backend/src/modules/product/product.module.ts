import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { ManufacturerModule } from '@/modules/manufacturer/manufacturer.module';
import { ProductStockPrismaRepository } from '@/modules/product/repository/product-stock-prisma.repository';
import { ProductStockRepository } from '@/modules/product/repository/product-stock.repository';
import { ProductPrismaRepository } from '@/modules/product/repository/product-prisma.repository';
import { ProductRepository } from '@/modules/product/repository/product.repository';
import { ProductService } from '@/modules/product/product.service';
import { WarehouseModule } from '@/modules/warehouse/warehouse.module';

/**
 * Products and their warehouse quantities. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule, ManufacturerModule, WarehouseModule],
  providers: [
    ProductService,
    { provide: ProductRepository, useClass: ProductPrismaRepository },
    { provide: ProductStockRepository, useClass: ProductStockPrismaRepository },
  ],
  exports: [ProductService],
})
export class ProductModule {}
