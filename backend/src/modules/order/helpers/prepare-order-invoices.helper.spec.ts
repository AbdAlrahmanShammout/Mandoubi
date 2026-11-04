import { describe, expect, it } from '@jest/globals';
import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { InvoiceStatus } from '@/modules/invoice/enum/invoice-status.enum';
import { OrderStatus } from '@/modules/order/enum/order-status.enum';
import { deriveOrderStatus } from '@/modules/order/helpers/derive-order-status.helper';
import { OrderableProduct, prepareOrderInvoices } from '@/modules/order/helpers/prepare-order-invoices.helper';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

const now = new Date('2026-11-05T00:00:00.000Z');

describe('Order split', () => {
  it('splits categories and snapshots the offer, price, and primary warehouse', () => {
    const prepared = prepareOrderInvoices({
      lines: [
        { productId: 2, paidQuantity: 2 },
        { productId: 1, paidQuantity: 8 },
      ],
      products: [product({ id: 1 }), product({ id: 2, category: ProductCategory.FOREIGN_MEDICINE, invoiceCurrency: InvoiceCurrency.USD, offerActive: false })],
      now,
    });
    expect(prepared.map((invoice) => invoice.category)).toEqual([ProductCategory.NATIONAL_MEDICINE, ProductCategory.FOREIGN_MEDICINE]);
    const national = prepared[0].items[0];
    expect(national.freeQuantity).toBe(2);
    expect(national.totalQuantity).toBe(10);
    expect(national.paidQuantity).toBe(8);
    expect(national.unitPrice).toBe('15000.00');
    expect(national.lineAmount).toBe('120000.00');
    expect(national.currency).toBe(InvoiceCurrency.SYP);
    expect(national.primaryWarehouseId).toBe(7);
    expect(national.offerPaidUnits).toBe(4);
    const foreign = prepared[1].items[0];
    expect(foreign.freeQuantity).toBe(0);
    expect(foreign.unitPrice).toBe('2.50');
    expect(foreign.currency).toBe(InvoiceCurrency.USD);
    expect(foreign.offerPaidUnits).toBeNull();
  });
  it('rejects a paid quantity above the maximum even when free units would still fit', () => {
    expect(() => prepareOrderInvoices({ lines: [{ productId: 1, paidQuantity: 11 }], products: [product({ id: 1, maximumOrderQuantity: 10, availableQuantity: 100 })], now })).toThrow(InvalidStateException);
  });
  it('counts free units against available stock', () => {
    expect(() => prepareOrderInvoices({ lines: [{ productId: 1, paidQuantity: 8 }], products: [product({ id: 1, availableQuantity: 9 })], now })).toThrow(InvalidStateException);
  });
  it('derives the parent status from the invoices', () => {
    expect(deriveOrderStatus([InvoiceStatus.PENDING, InvoiceStatus.PENDING])).toBe(OrderStatus.PENDING);
    expect(deriveOrderStatus([InvoiceStatus.APPROVED, InvoiceStatus.PENDING])).toBe(OrderStatus.PARTIALLY_APPROVED);
    expect(deriveOrderStatus([InvoiceStatus.APPROVED, InvoiceStatus.APPROVED])).toBe(OrderStatus.APPROVED);
    expect(deriveOrderStatus([InvoiceStatus.APPROVED, InvoiceStatus.REJECTED])).toBe(OrderStatus.PARTIALLY_APPROVED);
    expect(deriveOrderStatus([InvoiceStatus.REJECTED, InvoiceStatus.REJECTED])).toBe(OrderStatus.COMPLETED);
    expect(deriveOrderStatus([InvoiceStatus.ASSIGNED, InvoiceStatus.APPROVED])).toBe(OrderStatus.PARTIALLY_DELIVERED);
    expect(deriveOrderStatus([InvoiceStatus.DELIVERED_PAID, InvoiceStatus.REJECTED])).toBe(OrderStatus.COMPLETED);
    expect(deriveOrderStatus([InvoiceStatus.NOT_DELIVERED])).toBe(OrderStatus.PARTIALLY_DELIVERED);
    expect(deriveOrderStatus([InvoiceStatus.RETURNED_TO_WAREHOUSE, InvoiceStatus.OUT_FOR_DELIVERY])).toBe(OrderStatus.PARTIALLY_DELIVERED);
  });
});

function product(overrides: Partial<OrderableProduct> & Pick<OrderableProduct, 'id'>): OrderableProduct {
  return {
    name: `Product ${overrides.id}`,
    barcode: `barcode-${overrides.id}`,
    status: ProductStatus.ACTIVE,
    availability: ProductAvailability.AVAILABLE,
    category: ProductCategory.NATIONAL_MEDICINE,
    saleUnit: SaleUnit.PACK,
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 20,
    invoiceCurrency: InvoiceCurrency.SYP,
    pharmacyPriceUsd: '2.50',
    pharmacyPriceSyp: '15000.00',
    consumerPriceUsd: '3.00',
    consumerPriceSyp: '20000.00',
    offerActive: true,
    offerPaidUnits: 4,
    offerFreeUnits: 1,
    offerStartsAt: new Date('2026-11-01T00:00:00.000Z'),
    offerEndsAt: new Date('2026-12-01T00:00:00.000Z'),
    primaryWarehouseId: 7,
    availableQuantity: 30,
    ...overrides,
  };
}
