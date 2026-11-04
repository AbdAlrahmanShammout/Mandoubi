import { Module } from '@nestjs/common';
import { PaymentPrismaRepository } from '@/modules/payment/repository/payment-prisma.repository';
import { PaymentRepository } from '@/modules/payment/repository/payment.repository';
import { PaymentService } from '@/modules/payment/payment.service';
import { PharmacyModule } from '@/modules/pharmacy/pharmacy.module';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Receipts and driver collections. Controllers are registered by the admin API module.
 */
@Module({
  imports: [DatabaseProviderModule, PharmacyModule],
  providers: [PaymentService, { provide: PaymentRepository, useClass: PaymentPrismaRepository }],
  exports: [PaymentService],
})
export class PaymentModule {}
