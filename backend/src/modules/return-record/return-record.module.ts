import { Module } from '@nestjs/common';
import { AuditModule } from '@/modules/audit/audit.module';
import { InvoiceModule } from '@/modules/invoice/invoice.module';
import { NotificationModule } from '@/modules/notification/notification.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { ProductModule } from '@/modules/product/product.module';
import { ReturnRecordPrismaRepository } from '@/modules/return-record/repository/return-record-prisma.repository';
import { ReturnRecordRepository } from '@/modules/return-record/repository/return-record.repository';
import { ReturnRecordService } from '@/modules/return-record/return-record.service';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Invoice returns. Controllers are registered by the admin API module.
 */
@Module({
  imports: [DatabaseProviderModule, AuditModule, InvoiceModule, NotificationModule, PaymentModule, ProductModule],
  providers: [ReturnRecordService, { provide: ReturnRecordRepository, useClass: ReturnRecordPrismaRepository }],
  exports: [ReturnRecordService],
})
export class ReturnRecordModule {}
