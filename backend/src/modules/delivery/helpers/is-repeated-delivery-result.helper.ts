import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';

const OPEN_DELIVERY_STATUSES: readonly InvoiceStatus[] = [InvoiceStatus.ASSIGNED, InvoiceStatus.OUT_FOR_DELIVERY];

/**
 * A closed invoice ignores a second submit of the result already stored for it.
 */
export function isRepeatedDeliveryResult(input: { readonly invoiceStatus: InvoiceStatus; readonly recordedResult: DeliveryResult | null; readonly submittedResult: DeliveryResult }): boolean {
  if (OPEN_DELIVERY_STATUSES.includes(input.invoiceStatus)) {
    return false;
  }
  return input.recordedResult !== null && input.recordedResult === input.submittedResult;
}
