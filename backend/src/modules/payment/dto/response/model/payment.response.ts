import { ApiProperty } from '@nestjs/swagger';
import { BaseModelResponse } from '@/common/base/base-model.response';
import { PaymentEntity } from '@/modules/payment/entity/payment.entity';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Payment returned to the admin dashboard.
 */
export class PaymentResponse extends BaseModelResponse {
  @ApiProperty({ example: 1 })
  readonly pharmacyId: number;
  @ApiProperty({ enum: PaymentKind, example: PaymentKind.RECEIPT })
  readonly kind: PaymentKind;
  @ApiProperty({ enum: InvoiceCurrency, example: InvoiceCurrency.SYP })
  readonly currency: InvoiceCurrency;
  @ApiProperty({ example: '60000.00' })
  readonly amount: string;
  @ApiProperty({ example: 'Ahmad Cashier' })
  readonly receivedByName: string;
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  readonly paymentMethod: PaymentMethod;
  @ApiProperty({ example: 2, nullable: true })
  readonly driverId: number | null;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly occurredAt: Date;
  @ApiProperty({ type: Number, isArray: true, example: [1] })
  readonly invoiceIds: number[];
  constructor(payment: PaymentEntity) {
    super(payment);
    this.pharmacyId = payment.pharmacyId;
    this.kind = payment.kind;
    this.currency = payment.currency;
    this.amount = payment.amount;
    this.receivedByName = payment.receivedByName;
    this.paymentMethod = payment.paymentMethod;
    this.driverId = payment.driverId;
    this.occurredAt = payment.occurredAt;
    this.invoiceIds = payment.invoiceIds;
  }
}
