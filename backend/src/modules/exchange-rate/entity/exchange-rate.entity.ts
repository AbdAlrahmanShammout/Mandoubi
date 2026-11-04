import { BaseEntity } from '@/common/base/base.entity';
import { ExchangeRateZodType } from '@/modules/exchange-rate/zod/exchange-rate.zod';

/**
 * Value of one US dollar in Syrian pounds.
 */
export class ExchangeRateEntity extends BaseEntity {
  usdToSyp!: string;
  constructor(data: ExchangeRateZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
