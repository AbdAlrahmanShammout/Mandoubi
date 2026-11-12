import { describe, expect, it } from '@jest/globals';
import { ProductEntity } from '@/modules/product/entity/product.entity';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { toPharmacyProductView } from '@/modules/product/helpers/pharmacy-product-view.helper';
import { ManufacturerEntity } from '@/modules/manufacturer/entity/manufacturer.entity';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';
import { ProductStockEntity } from '@/modules/product/entity/product-stock.entity';

describe('pharmacy product view', () => {
  it('shows the invoice-currency prices and the primary warehouse quantity', () => {
    const product = productWith({ invoiceCurrency: InvoiceCurrency.SYP, quantity: 4, reservedQuantity: 1, lowQuantityThreshold: 5 });
    const actual = toPharmacyProductView(product);
    expect(actual.pharmacyUnitPrice).toBe('15000.00');
    expect(actual.consumerUnitPrice).toBe('20000.00');
    expect(actual.availableQuantity).toBe(3);
    expect(actual.limitedQuantity).toBe(true);
    expect(actual.manufacturerName).toBe('Ibn Al Haytham');
  });
  it('uses the dollar prices when the invoice currency is USD', () => {
    const product = productWith({ invoiceCurrency: InvoiceCurrency.USD, quantity: 20, reservedQuantity: 0, lowQuantityThreshold: 5 });
    const actual = toPharmacyProductView(product);
    expect(actual.pharmacyUnitPrice).toBe('2.50');
    expect(actual.consumerUnitPrice).toBe('3.00');
    expect(actual.limitedQuantity).toBe(false);
  });
  it('hides a negative available quantity', () => {
    const product = productWith({ invoiceCurrency: InvoiceCurrency.SYP, quantity: 1, reservedQuantity: 4, lowQuantityThreshold: 0 });
    expect(toPharmacyProductView(product).availableQuantity).toBe(0);
  });
});

function productWith(input: { readonly invoiceCurrency: InvoiceCurrency; readonly quantity: number; readonly reservedQuantity: number; readonly lowQuantityThreshold: number }): ProductEntity {
  const product = new ProductEntity({
    id: 1,
    createdAt: new Date('2026-11-12T00:00:00.000Z'),
    updatedAt: new Date('2026-11-12T00:00:00.000Z'),
    deletedAt: null,
    name: 'Paracetamol 500',
    barcode: '6281000000001',
    manufacturerId: 3,
    activeIngredient: 'Paracetamol',
    imageUrl: null,
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 20,
    lowQuantityThreshold: input.lowQuantityThreshold,
    pharmacyPriceUsd: '2.50',
    pharmacyPriceSyp: '15000.00',
    consumerPriceUsd: '3.00',
    consumerPriceSyp: '20000.00',
    calculateSypFromRate: false,
    invoiceCurrency: input.invoiceCurrency,
    category: ProductCategory.NATIONAL_MEDICINE,
    saleUnit: SaleUnit.PACK,
    offerActive: false,
    offerPaidUnits: null,
    offerFreeUnits: null,
    offerStartsAt: null,
    offerEndsAt: null,
    availability: ProductAvailability.AVAILABLE,
    status: ProductStatus.ACTIVE,
  });
  product.manufacturer = new ManufacturerEntity({
    id: 3,
    createdAt: new Date('2026-11-12T00:00:00.000Z'),
    updatedAt: new Date('2026-11-12T00:00:00.000Z'),
    deletedAt: null,
    name: 'Ibn Al Haytham',
    status: ManufacturerStatus.ACTIVE,
  });
  product.stocks = [
    new ProductStockEntity({
      id: 8,
      createdAt: new Date('2026-11-12T00:00:00.000Z'),
      updatedAt: new Date('2026-11-12T00:00:00.000Z'),
      productId: 1,
      warehouseId: 2,
      quantity: input.quantity,
      reservedQuantity: input.reservedQuantity,
      isPrimary: true,
    }),
    new ProductStockEntity({
      id: 9,
      createdAt: new Date('2026-11-12T00:00:00.000Z'),
      updatedAt: new Date('2026-11-12T00:00:00.000Z'),
      productId: 1,
      warehouseId: 4,
      quantity: 50,
      reservedQuantity: 0,
      isPrimary: false,
    }),
  ];
  return product;
}
