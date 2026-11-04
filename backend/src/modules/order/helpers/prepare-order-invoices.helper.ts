import { InvalidStateException } from '@/common/exceptions/invalid-state.exception';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { PreparedInvoiceItem } from '@/modules/invoice/defs/invoice-repository.defs';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';
import { multiplyMoney } from '@/modules/product/helpers/syp-price.helper';

/**
 * Product data the split needs. Prices and the primary warehouse are copied, not referenced later.
 */
export interface OrderableProduct {
  readonly id: number;
  readonly name: string;
  readonly barcode: string;
  readonly status: ProductStatus;
  readonly availability: ProductAvailability;
  readonly category: ProductCategory;
  readonly saleUnit: SaleUnit;
  readonly minimumOrderQuantity: number;
  readonly maximumOrderQuantity: number;
  readonly invoiceCurrency: InvoiceCurrency;
  readonly pharmacyPriceUsd: string;
  readonly pharmacyPriceSyp: string;
  readonly consumerPriceUsd: string;
  readonly consumerPriceSyp: string;
  readonly offerActive: boolean;
  readonly offerPaidUnits: number | null;
  readonly offerFreeUnits: number | null;
  readonly offerStartsAt: Date | null;
  readonly offerEndsAt: Date | null;
  readonly primaryWarehouseId: number;
  readonly availableQuantity: number;
}

/**
 * One product the pharmacy asked to buy. Free units are calculated, not sent.
 */
export interface OrderLineInput {
  readonly productId: number;
  readonly paidQuantity: number;
}

/**
 * One category invoice produced from the submitted lines.
 */
export interface PreparedInvoice {
  readonly category: ProductCategory;
  readonly items: readonly PreparedInvoiceItem[];
}

const CATEGORY_ORDER: readonly ProductCategory[] = [ProductCategory.NATIONAL_MEDICINE, ProductCategory.FOREIGN_MEDICINE, ProductCategory.ACCESSORY];

/**
 * Splits submitted lines into one invoice per category and snapshots price, offer, and warehouse.
 */
export function prepareOrderInvoices(input: { readonly lines: readonly OrderLineInput[]; readonly products: readonly OrderableProduct[]; readonly now: Date }): PreparedInvoice[] {
  assertUniqueProducts(input.lines);
  const grouped = new Map<ProductCategory, PreparedInvoiceItem[]>();
  for (const line of input.lines) {
    const item = prepareItem(line, findProduct(input.products, line.productId), input.now);
    const current = grouped.get(item.category) ?? [];
    current.push(item.snapshot);
    grouped.set(item.category, current);
  }
  return CATEGORY_ORDER.filter((category) => grouped.has(category)).map((category) => ({ category, items: grouped.get(category) ?? [] }));
}

function assertUniqueProducts(lines: readonly OrderLineInput[]): void {
  const seen = new Set<number>();
  for (const line of lines) {
    if (seen.has(line.productId)) {
      throw new InvalidStateException({ message: 'A product can be added once per order', code: 'PRODUCT_DUPLICATED' });
    }
    seen.add(line.productId);
  }
}

function findProduct(products: readonly OrderableProduct[], productId: number): OrderableProduct {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    throw new ResourceNotFoundException('Product', productId);
  }
  return product;
}

function prepareItem(line: OrderLineInput, product: OrderableProduct, now: Date): { category: ProductCategory; snapshot: PreparedInvoiceItem } {
  assertOrderable(product, line.paidQuantity);
  const offer = calculateFreeQuantity(product, line.paidQuantity, now);
  if (offer.totalQuantity > product.availableQuantity) {
    throw new InvalidStateException({ message: 'The primary warehouse does not have enough available quantity', code: 'INSUFFICIENT_STOCK' });
  }
  const price = snapshotPrice(product);
  return {
    category: product.category,
    snapshot: {
      productId: product.id,
      productName: product.name,
      barcode: product.barcode,
      saleUnit: product.saleUnit,
      paidQuantity: line.paidQuantity,
      freeQuantity: offer.freeQuantity,
      totalQuantity: offer.totalQuantity,
      unitPrice: price.unitPrice,
      consumerUnitPrice: price.consumerUnitPrice,
      currency: price.currency,
      lineAmount: multiplyMoney(price.unitPrice, line.paidQuantity),
      primaryWarehouseId: product.primaryWarehouseId,
      offerPaidUnits: offer.offerPaidUnits,
      offerFreeUnits: offer.offerFreeUnits,
    },
  };
}

function assertOrderable(product: OrderableProduct, paidQuantity: number): void {
  if (product.status !== ProductStatus.ACTIVE || product.availability !== ProductAvailability.AVAILABLE) {
    throw new InvalidStateException({ message: 'This product cannot be ordered', code: 'PRODUCT_NOT_ORDERABLE' });
  }
  if (paidQuantity < product.minimumOrderQuantity || paidQuantity > product.maximumOrderQuantity) {
    throw new InvalidStateException({ message: 'The paid quantity is outside the order limits', code: 'ORDER_QUANTITY_INVALID' });
  }
}

function calculateFreeQuantity(product: OrderableProduct, paidQuantity: number, now: Date): { freeQuantity: number; totalQuantity: number; offerPaidUnits: number | null; offerFreeUnits: number | null } {
  const offerApplies = isOfferInForce(product, now);
  if (!offerApplies || product.offerPaidUnits === null || product.offerFreeUnits === null) {
    return { freeQuantity: 0, totalQuantity: paidQuantity, offerPaidUnits: null, offerFreeUnits: null };
  }
  const sets = Math.floor(paidQuantity / product.offerPaidUnits);
  const freeQuantity = sets * product.offerFreeUnits;
  return { freeQuantity, totalQuantity: paidQuantity + freeQuantity, offerPaidUnits: product.offerPaidUnits, offerFreeUnits: product.offerFreeUnits };
}

function isOfferInForce(product: OrderableProduct, now: Date): boolean {
  if (!product.offerActive || product.offerStartsAt === null || product.offerEndsAt === null) {
    return false;
  }
  return now >= product.offerStartsAt && now <= product.offerEndsAt;
}

function snapshotPrice(product: OrderableProduct): { currency: InvoiceCurrency; unitPrice: string; consumerUnitPrice: string } {
  if (product.invoiceCurrency === InvoiceCurrency.USD) {
    return { currency: InvoiceCurrency.USD, unitPrice: product.pharmacyPriceUsd, consumerUnitPrice: product.consumerPriceUsd };
  }
  return { currency: InvoiceCurrency.SYP, unitPrice: product.pharmacyPriceSyp, consumerUnitPrice: product.consumerPriceSyp };
}
