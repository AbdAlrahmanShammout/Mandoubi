import { Injectable } from '@nestjs/common';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { ExchangeRateEntity } from '@/modules/exchange-rate/entity/exchange-rate.entity';
import { ExchangeRateRepository } from '@/modules/exchange-rate/repository/exchange-rate.repository';

const RATE_PATTERN = /^(?:0|[1-9]\d{0,12})(?:\.\d{1,4})?$/;

/**
 * The one USD to Syrian-pound setting.
 */
@Injectable()
export class ExchangeRateService {
  constructor(private readonly exchangeRateRepository: ExchangeRateRepository) {}
  /**
   * Loads the current rate or fails when an administrator has not set it.
   */
  async getExchangeRate(): Promise<ExchangeRateEntity> {
    const rate = await this.exchangeRateRepository.findCurrent();
    if (!rate) {
      throw new ResourceNotFoundException('Exchange rate', 'current');
    }
    return rate;
  }
  /**
   * Returns the current rate for price calculation.
   */
  async requireUsdToSyp(): Promise<string> {
    const rate = await this.exchangeRateRepository.findCurrent();
    if (!rate) {
      throw new InvalidStateException({
        message: 'Set the exchange rate before calculating Syrian-pound prices',
        code: 'EXCHANGE_RATE_MISSING',
      });
    }
    return rate.usdToSyp;
  }
  /**
   * Replaces the value of one US dollar in Syrian pounds.
   */
  async replaceUsdToSyp(usdToSyp: string): Promise<ExchangeRateEntity> {
    if (!RATE_PATTERN.test(usdToSyp) || Number(usdToSyp) <= 0) {
      throw new InvalidStateException({ message: 'The exchange rate must be greater than zero', code: 'EXCHANGE_RATE_INVALID' });
    }
    return this.exchangeRateRepository.save(usdToSyp);
  }
}
