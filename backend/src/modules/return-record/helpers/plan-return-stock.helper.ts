import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';

/**
 * How a return changes the warehouse stored on the invoice.
 */
export type ReturnStockEffect = 'release' | 'restock';

/**
 * Chooses the single stock effect for a return. A delivered unpaid invoice adds quantity once. A missed delivery only releases the reservation.
 */
export function planReturnStock(status: InvoiceStatus): ReturnStockEffect {
  if (status === InvoiceStatus.NOT_DELIVERED) {
    return 'release';
  }
  if (status === InvoiceStatus.DELIVERED_UNPAID) {
    return 'restock';
  }
  throw new InvalidStateException({ message: 'Only an unpaid or undelivered invoice can return to the warehouse', code: 'RETURN_NOT_ALLOWED' });
}
