import { ApiProperty } from '@nestjs/swagger';
import { MoneyTotal } from '@/modules/invoice/helpers/invoice-totals.helper';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Total amount in one currency.
 */
export class MoneyTotalResponse {
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '120000.00' })
  readonly amount: string;
  constructor(total: MoneyTotal) {
    this.currency = total.currency;
    this.amount = total.amount;
  }
}
