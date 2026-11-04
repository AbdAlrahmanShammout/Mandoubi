import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { PaymentEntity } from '@/modules/payment/entity/payment.entity';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { moneyEquals, sumMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Accepts a handover only when it covers whole unsettled collections for that driver and currency.
 */
export function planDriverSettlement(input: { readonly driverId: number; readonly currency: InvoiceCurrency; readonly amount: string; readonly paymentIds: readonly number[]; readonly payments: readonly PaymentEntity[] }): number[] {
  if (new Set(input.paymentIds).size !== input.paymentIds.length) {
    throw new InvalidStateException({ message: 'A collection can be listed once on a settlement', code: 'PAYMENT_DUPLICATED' });
  }
  const selected = input.paymentIds.map((paymentId) => findPayment(input.payments, paymentId));
  selected.forEach((payment) => assertCollection(payment, input.driverId, input.currency));
  const covered = sumMoney(selected.map((payment) => payment.amount));
  if (!moneyEquals(covered, input.amount)) {
    throw new InvalidStateException({ message: 'The settlement amount must equal the selected collections', code: 'SETTLEMENT_AMOUNT_MISMATCH' });
  }
  return selected.map((payment) => payment.id);
}

function findPayment(payments: readonly PaymentEntity[], paymentId: number): PaymentEntity {
  const payment = payments.find((item) => item.id === paymentId);
  if (!payment) {
    throw new ResourceNotFoundException('Payment', paymentId);
  }
  return payment;
}

function assertCollection(payment: PaymentEntity, driverId: number, currency: InvoiceCurrency): void {
  if (payment.kind !== PaymentKind.DRIVER_COLLECTION || payment.driverId !== driverId || payment.currency !== currency) {
    throw new InvalidStateException({ message: 'The settlement can include only this driver collections in the selected currency', code: 'SETTLEMENT_PAYMENT_MISMATCH' });
  }
  if (payment.settled) {
    throw new InvalidStateException({ message: 'This collection has already been handed over', code: 'COLLECTION_ALREADY_SETTLED' });
  }
}
