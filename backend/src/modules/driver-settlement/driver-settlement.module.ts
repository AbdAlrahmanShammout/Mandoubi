import { Module } from '@nestjs/common';
import { DeliveryModule } from '@/modules/delivery/delivery.module';
import { DriverSettlementPrismaRepository } from '@/modules/driver-settlement/repository/driver-settlement-prisma.repository';
import { DriverSettlementRepository } from '@/modules/driver-settlement/repository/driver-settlement.repository';
import { DriverSettlementService } from '@/modules/driver-settlement/driver-settlement.service';
import { DriverModule } from '@/modules/driver/driver.module';
import { PaymentModule } from '@/modules/payment/payment.module';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Driver handovers. Controllers are registered by the admin API module.
 */
@Module({
  imports: [DatabaseProviderModule, DeliveryModule, DriverModule, PaymentModule],
  providers: [DriverSettlementService, { provide: DriverSettlementRepository, useClass: DriverSettlementPrismaRepository }],
  exports: [DriverSettlementService],
})
export class DriverSettlementModule {}