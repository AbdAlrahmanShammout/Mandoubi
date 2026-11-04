import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { DeliveryPrismaRepository } from '@/modules/delivery/repository/delivery-prisma.repository';
import { DeliveryRepository } from '@/modules/delivery/repository/delivery.repository';
import { DeliveryService } from '@/modules/delivery/delivery.service';
import { DriverModule } from '@/modules/driver/driver.module';
import { InvoiceModule } from '@/modules/invoice/invoice.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { ProductModule } from '@/modules/product/product.module';
import { UserModule } from '@/modules/user/user.module';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Invoice assignments and append-only delivery results. Controllers are registered by audience modules.
 */
@Module({
  imports: [AuditModule, DatabaseProviderModule, DriverModule, InvoiceModule, NotificationModule, PaymentModule, ProductModule, UserModule],
  providers: [DeliveryService, { provide: DeliveryRepository, useClass: DeliveryPrismaRepository }],
  exports: [DeliveryService],
})
export class DeliveryModule {}