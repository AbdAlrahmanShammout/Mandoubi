import { BaseEntity } from '@/common/base/base.entity';
import { DriverSettlementZodType } from '@/modules/driver-settlement/zod/driver-settlement.zod';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Money a driver handed to the administration.
 */
export class DriverSettlementEntity extends BaseEntity {
  driverId!: number;
  currency!: InvoiceCurrency;
  amount!: string;
  receivedByName!: string;
  occurredAt!: Date;
  paymentIds: number[] = [];
  constructor(data: DriverSettlementZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
