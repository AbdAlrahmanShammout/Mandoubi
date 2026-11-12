import { describe, expect, it } from '@jest/globals';
import { rankRequestedProducts } from '@/modules/invoice/helpers/rank-requested-products.helper';

describe('rank requested products', () => {
  it('orders by paid quantity and breaks ties by product id', () => {
    const actual = rankRequestedProducts([
      { productId: 4, requestedQuantity: 2 },
      { productId: 2, requestedQuantity: 8 },
      { productId: 9, requestedQuantity: 8 },
    ]);
    expect(actual.map((row) => row.productId)).toEqual([2, 9, 4]);
  });
});
