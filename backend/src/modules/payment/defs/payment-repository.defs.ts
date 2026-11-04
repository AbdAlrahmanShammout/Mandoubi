import { ReceiptAllocation } from '@/modules/payment/helpers/plan-receipt-allocations.helper';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Payment written with the whole invoices it covers.
 */
export interface CreatePaymentRepoInput {
  readonly pharmacyId: number;
  readonly kind: PaymentKind;
  readonly currency: InvoiceCurrency;
  readonly amount: string;
  readonly receivedByName: string;
  readonly paymentMethod: PaymentMethod;
  readonly driverId: number | null;
  readonly occurredAt: Date;
  readonly allocations: readonly ReceiptAllocation[];
}
