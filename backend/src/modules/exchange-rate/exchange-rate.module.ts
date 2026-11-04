import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { ExchangeRatePrismaRepository } from '@/modules/exchange-rate/repository/exchange-rate-prisma.repository';
import { ExchangeRateRepository } from '@/modules/exchange-rate/repository/exchange-rate.repository';
import { ExchangeRateService } from '@/modules/exchange-rate/exchange-rate.service';

/**
 * The USD to Syrian-pound setting. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [ExchangeRateService, { provide: ExchangeRateRepository, useClass: ExchangeRatePrismaRepository }],
  exports: [ExchangeRateService],
})
export class ExchangeRateModule {}
