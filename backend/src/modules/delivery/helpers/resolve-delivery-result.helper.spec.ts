import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { resolveDeliveryResult } from '@/modules/delivery/helpers/resolve-delivery-result.helper';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';

describe('Delivery result', () => {
  it('stores the recipient when the invoice was delivered and paid', () => {
    const actual = resolveDeliveryResult({ result: DeliveryResult.DELIVERED_PAID, recipientName: '  Lina  ', note: '  Left at the counter  ' });
    expect(actual).toEqual({
      result: DeliveryResult.DELIVERED_PAID,
      nonDeliveryReason: null,
      recipientName: 'Lina',
      note: 'Left at the counter',
    });
  });
  it('requires a fixed reason when the invoice was not delivered', () => {
    expect(() => resolveDeliveryResult({ result: DeliveryResult.NOT_DELIVERED })).toThrow(InvalidStateException);
    const actual = resolveDeliveryResult({ result: DeliveryResult.NOT_DELIVERED, nonDeliveryReason: NonDeliveryReason.PHARMACY_CLOSED, recipientName: 'Ignored' });
    expect(actual.nonDeliveryReason).toBe(NonDeliveryReason.PHARMACY_CLOSED);
    expect(actual.recipientName).toBeNull();
  });
});
