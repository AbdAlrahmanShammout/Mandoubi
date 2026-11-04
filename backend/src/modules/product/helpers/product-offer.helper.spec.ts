import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { resolveProductOffer } from '@/modules/product/helpers/product-offer.helper';

describe('product offer', () => {
  const startsAt = new Date('2026-11-01T00:00:00.000Z');
  const endsAt = new Date('2026-12-01T00:00:00.000Z');
  it('clears the offer when it is off', () => {
    expect(resolveProductOffer({ offerActive: false, offerPaidUnits: 4 })).toEqual({
      offerActive: false,
      offerPaidUnits: null,
      offerFreeUnits: null,
      offerStartsAt: null,
      offerEndsAt: null,
    });
  });
  it('keeps one product offer when the range is valid and rejects an inverted range', () => {
    expect(resolveProductOffer({ offerActive: true, offerPaidUnits: 4, offerFreeUnits: 1, offerStartsAt: startsAt, offerEndsAt: endsAt })).toEqual({
      offerActive: true,
      offerPaidUnits: 4,
      offerFreeUnits: 1,
      offerStartsAt: startsAt,
      offerEndsAt: endsAt,
    });
    expect(() => resolveProductOffer({ offerActive: true, offerPaidUnits: 4, offerFreeUnits: 1, offerStartsAt: endsAt, offerEndsAt: startsAt })).toThrow(InvalidStateException);
  });
});
