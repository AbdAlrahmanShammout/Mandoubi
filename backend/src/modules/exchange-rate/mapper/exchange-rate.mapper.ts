import { ExchangeRate } from '@prisma/client';
import { ExchangeRateEntity } from '@/modules/exchange-rate/entity/exchange-rate.entity';

/**
 * Maps the exchange-rate row to the domain entity.
 */
export class ExchangeRateMapper {
  /**
   * Copies the persistence payload into an exchange-rate entity.
   */
  static toEntity(payload: ExchangeRate): ExchangeRateEntity {
    return new ExchangeRateEntity({
      id: payload.id,
      usdToSyp: payload.usdToSyp.toFixed(4),
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
  }
}
