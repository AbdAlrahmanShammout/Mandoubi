import { describe, expect, it } from '@jest/globals';
import { isRepeatedDeliveryResult } from '@/modules/delivery/helpers/is-repeated-delivery-result.helper';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';

describe('Repeated delivery result', () => {
  it('ignores the same result after the invoice is closed and still accepts a new result while it is out for delivery', () => {
    expect(isRepeatedDeliveryResult({
      invoiceStatus: InvoiceStatus.DELIVERED_PAID,
      recordedResult: DeliveryResult.DELIVERED_PAID,
      submittedResult: DeliveryResult.DELIVERED_PAID,
    })).toBe(true);
    expect(isRepeatedDeliveryResult({
      invoiceStatus: InvoiceStatus.DELIVERED_PAID,
      recordedResult: DeliveryResult.DELIVERED_PAID,
      submittedResult: DeliveryResult.DELIVERED_UNPAID,
    })).toBe(false);
    expect(isRepeatedDeliveryResult({
      invoiceStatus: InvoiceStatus.OUT_FOR_DELIVERY,
      recordedResult: DeliveryResult.NOT_DELIVERED,
      submittedResult: DeliveryResult.NOT_DELIVERED,
    })).toBe(false);
  });
});
