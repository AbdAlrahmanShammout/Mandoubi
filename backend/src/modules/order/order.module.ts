import { Module } from '@nestjs/common';
import { InvoiceModule } from '@/modules/invoice/invoice.module';
import { OrderPrismaRepository } from '@/modules/order/repository/order-prisma.repository';
import { OrderRepository } from '@/modules/order/repository/order.repository';
import { OrderService } from '@/modules/order/order.service';
import { ProductModule } from '@/modules/product/product.module';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Parent orders. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule, InvoiceModule, ProductModule],
  providers: [OrderService, { provide: OrderRepository, useClass: OrderPrismaRepository }],
  exports: [OrderService],
})
export class OrderModule {}
