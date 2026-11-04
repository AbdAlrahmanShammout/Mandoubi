import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { preserveReservedStock } from '@/modules/product/helpers/preserve-reserved-stock.helper';

describe('Reserved stock preservation', () => {
  it('keeps the reserved quantity on the same warehouse', () => {
    const actual = preserveReservedStock(
      [
        { warehouseId: 1, reservedQuantity: 4 },
        { warehouseId: 2, reservedQuantity: 0 },
      ],
      [
        { warehouseId: 1, quantity: 10, isPrimary: false },
        { warehouseId: 2, quantity: 3, isPrimary: true },
      ],
    );
    expect(actual).toEqual([
      { warehouseId: 1, quantity: 10, isPrimary: false, reservedQuantity: 4 },
      { warehouseId: 2, quantity: 3, isPrimary: true, reservedQuantity: 0 },
    ]);
  });
  it('refuses to drop a warehouse that still holds a reservation', () => {
    expect(() => preserveReservedStock([{ warehouseId: 1, reservedQuantity: 4 }], [{ warehouseId: 2, quantity: 9, isPrimary: true }])).toThrow(InvalidStateException);
  });
});
