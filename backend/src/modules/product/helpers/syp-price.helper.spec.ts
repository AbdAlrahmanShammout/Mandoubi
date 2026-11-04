import { describe, expect, it } from '@jest/globals';
import { calculateSypPrice } from '@/modules/product/helpers/syp-price.helper';

describe('Syrian-pound price', () => {
  it('multiplies the dollar price by the exchange rate and rounds half up', () => {
    expect(calculateSypPrice('2.50', '15000')).toBe('37500.00');
    expect(calculateSypPrice('2', '15000.125')).toBe('30000.25');
  });
});
