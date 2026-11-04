import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';

/**
 * Offer fields supplied by an administrator. An offer belongs to one product.
 */
export interface OfferSelection {
  readonly offerActive?: boolean;
  readonly offerPaidUnits?: number | null;
  readonly offerFreeUnits?: number | null;
  readonly offerStartsAt?: Date | null;
  readonly offerEndsAt?: Date | null;
}

/**
 * Offer fields stored on the product.
 */
export interface ResolvedOffer {
  readonly offerActive: boolean;
  readonly offerPaidUnits: number | null;
  readonly offerFreeUnits: number | null;
  readonly offerStartsAt: Date | null;
  readonly offerEndsAt: Date | null;
}

/**
 * Turns an offer off by clearing it, or keeps one active offer with a valid range.
 */
export function resolveProductOffer(input: OfferSelection, current?: OfferSelection): ResolvedOffer {
  const offerActive = input.offerActive ?? current?.offerActive ?? false;
  if (!offerActive) {
    return { offerActive: false, offerPaidUnits: null, offerFreeUnits: null, offerStartsAt: null, offerEndsAt: null };
  }
  const offerPaidUnits = input.offerPaidUnits === undefined ? current?.offerPaidUnits : input.offerPaidUnits;
  const offerFreeUnits = input.offerFreeUnits === undefined ? current?.offerFreeUnits : input.offerFreeUnits;
  const offerStartsAt = input.offerStartsAt === undefined ? current?.offerStartsAt : input.offerStartsAt;
  const offerEndsAt = input.offerEndsAt === undefined ? current?.offerEndsAt : input.offerEndsAt;
  if (!isPositiveInteger(offerPaidUnits) || !isPositiveInteger(offerFreeUnits) || !isDate(offerStartsAt) || !isDate(offerEndsAt) || offerEndsAt <= offerStartsAt) {
    throw new InvalidStateException({
      message: 'An active offer needs paid units, free units, and an end date after the start date',
      code: 'OFFER_INVALID',
    });
  }
  return { offerActive: true, offerPaidUnits, offerFreeUnits, offerStartsAt, offerEndsAt };
}

function isPositiveInteger(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isDate(value: Date | null | undefined): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}
