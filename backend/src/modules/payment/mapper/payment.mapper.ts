import { PaymentEntity } from '@/modules/payment/entity/payment.entity';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { PaymentType } from '@/modules/payment/types/payment-details-schema.type';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { formatMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Maps a payment row to the domain entity.
 */
export class PaymentMapper {
  /**
   * Copies the payment, the invoices it covers, and whether the driver has handed it over.
   */
  static toEntity(payload: PaymentType): PaymentEntity {
    const payment = new PaymentEntity({
      id: payload.id,
      pharmacyId: payload.pharmacyId,
      kind: payload.kind as PaymentKind,
      currency: payload.currency as InvoiceCurrency,
      amount: formatMoney(payload.amount),
      receivedByName: payload.receivedByName,
      paymentMethod: payload.paymentMethod as PaymentMethod,
      driverId: payload.driverId,
      occurredAt: payload.occurredAt,
      settled: payload.settlementLine !== null && payload.settlementLine !== undefined,
      createdAt: payload.createdAt,
      updatedAt: payload.updatedAt,
    });
    payment.invoiceIds = (payload.allocations ?? []).map((allocation) => allocation.invoiceId);
    return payment;
  }
}
