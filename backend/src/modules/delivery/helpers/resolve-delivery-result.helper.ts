import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { RECIPIENT_NAME_MIN_LENGTH } from '@/modules/delivery/constants/delivery-text.constant';
import { DeliveryResult } from '@/modules/delivery/enum/delivery-result.enum';
import { NonDeliveryReason } from '@/modules/delivery/enum/non-delivery-reason.enum';

/**
 * Result fields sent by the driver.
 */
export interface DeliveryResultSelection {
  readonly result: DeliveryResult;
  readonly nonDeliveryReason?: NonDeliveryReason;
  readonly recipientName?: string;
  readonly note?: string;
}

/**
 * Result fields stored on an append-only delivery event.
 */
export interface ResolvedDeliveryResult {
  readonly result: DeliveryResult;
  readonly nonDeliveryReason: NonDeliveryReason | null;
  readonly recipientName: string | null;
  readonly note: string | null;
}

/**
 * Keeps a non-delivery reason only for a missed delivery, and a recipient only when goods were handed over.
 */
export function resolveDeliveryResult(input: DeliveryResultSelection): ResolvedDeliveryResult {
  const note = readNote(input.note);
  if (input.result === DeliveryResult.NOT_DELIVERED) {
    if (!input.nonDeliveryReason) {
      throw new InvalidStateException({ message: 'A non-delivery result needs a reason', code: 'NON_DELIVERY_REASON_REQUIRED' });
    }
    return { result: input.result, nonDeliveryReason: input.nonDeliveryReason, recipientName: null, note };
  }
  if (input.nonDeliveryReason) {
    throw new InvalidStateException({ message: 'A delivered invoice does not take a non-delivery reason', code: 'NON_DELIVERY_REASON_UNEXPECTED' });
  }
  const recipientName = input.recipientName?.trim() ?? '';
  if (recipientName.length < RECIPIENT_NAME_MIN_LENGTH) {
    throw new InvalidStateException({ message: 'A delivered invoice needs the recipient name', code: 'RECIPIENT_NAME_REQUIRED' });
  }
  return { result: input.result, nonDeliveryReason: null, recipientName, note };
}

function readNote(note?: string): string | null {
  const trimmed = note?.trim() ?? '';
  if (trimmed.length === 0) {
    return null;
  }
  return trimmed;
}
