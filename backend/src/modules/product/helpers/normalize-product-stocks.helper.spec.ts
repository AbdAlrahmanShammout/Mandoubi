import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { assertOrderLimits, normalizeProductStocks } from '@/modules/product/helpers/normalize-product-stocks.helper';

describe('product stock rules', () => {
  it('makes the only warehouse primary', () => {
    const actual = normalizeProductStocks([{ warehouseId: 4, quantity: 10, isPrimary: false }]);
    expect(actual).toEqual([{ warehouseId: 4, quantity: 10, isPrimary: true }]);
  });
  it('requires exactly one primary warehouse when several are linked', () => {
    expect(() => normalizeProductStocks([
      { warehouseId: 1, quantity: 5 },
      { warehouseId: 2, quantity: 8 },
    ])).toThrow(InvalidStateException);
    const actual = normalizeProductStocks([
      { warehouseId: 1, quantity: 5, isPrimary: false },
      { warehouseId: 2, quantity: 8, isPrimary: true },
    ]);
    expect(actual[1].isPrimary).toBe(true);
  });
  it('rejects a duplicated warehouse and an inverted order limit', () => {
    expect(() => normalizeProductStocks([
      { warehouseId: 1, quantity: 5, isPrimary: true },
      { warehouseId: 1, quantity: 6 },
    ])).toThrow(InvalidStateException);
    expect(() => assertOrderLimits(5, 2)).toThrow(InvalidStateException);
  });
});
