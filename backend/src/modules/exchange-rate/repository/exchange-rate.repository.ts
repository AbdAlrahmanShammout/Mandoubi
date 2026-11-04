import { ExchangeRateEntity } from '@/modules/exchange-rate/entity/exchange-rate.entity';

/**
 * Persistence contract for the single exchange rate.
 */
export abstract class ExchangeRateRepository {
  /** Loads the current rate, or null when it has not been set. */
  abstract findCurrent(): Promise<ExchangeRateEntity | null>;
  /** Inserts or replaces the current rate. */
  abstract save(usdToSyp: string): Promise<ExchangeRateEntity>;
}
