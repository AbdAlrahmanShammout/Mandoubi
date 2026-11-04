import { BaseEntity } from '@/common/base/base.entity';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { PaymentZodType } from '@/modules/payment/zod/payment.zod';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Money received for one or more whole invoices in one currency.
 */
export class PaymentEntity extends BaseEntity {
  pharmacyId!: number;
  kind!: PaymentKind;
  currency!: InvoiceCurrency;
  amount!: string;
  receivedByName!: string;
  paymentMethod!: PaymentMethod;
  driverId!: number | null;
  occurredAt!: Date;
  settled!: boolean;
  invoiceIds: number[] = [];
  constructor(data: PaymentZodType) {
    super();
    Object.assign(this, data);
    this.deletedAt = null;
  }
}
