import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { EXCHANGE_RATE_ID } from '@/modules/exchange-rate/constants/exchange-rate-id.constant';
import { ExchangeRateEntity } from '@/modules/exchange-rate/entity/exchange-rate.entity';
import { ExchangeRateMapper } from '@/modules/exchange-rate/mapper/exchange-rate.mapper';
import { ExchangeRateRepository } from '@/modules/exchange-rate/repository/exchange-rate.repository';
/**
 * Prisma storage for the single exchange rate.
 */
@Injectable()
export class ExchangeRatePrismaRepository extends ExchangeRateRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Loads the single rate row. */
  async findCurrent(): Promise<ExchangeRateEntity | null> {
    const result = await this.prisma.exchangeRate.findUnique({ where: { id: EXCHANGE_RATE_ID } });
    return result ? ExchangeRateMapper.toEntity(result) : null;
  }
  /** Inserts or replaces the single rate row. */
  async save(usdToSyp: string): Promise<ExchangeRateEntity> {
    const result = await this.prisma.exchangeRate.upsert({
      where: { id: EXCHANGE_RATE_ID },
      create: { id: EXCHANGE_RATE_ID, usdToSyp: new Prisma.Decimal(usdToSyp) },
      update: { usdToSyp: new Prisma.Decimal(usdToSyp) },
    });
    return ExchangeRateMapper.toEntity(result);
  }
}
