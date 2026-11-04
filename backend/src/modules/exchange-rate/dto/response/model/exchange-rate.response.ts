import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { ExchangeRateEntity } from '@/modules/exchange-rate/entity/exchange-rate.entity';

/**
 * Exchange rate returned to the admin dashboard.
 */
export class ExchangeRateResponse extends BaseModelResponse {
  @ApiProperty({ example: '15000' })
  readonly usdToSyp: string;
  constructor(rate: ExchangeRateEntity) {
    super(rate);
    this.usdToSyp = rate.usdToSyp;
  }
}
