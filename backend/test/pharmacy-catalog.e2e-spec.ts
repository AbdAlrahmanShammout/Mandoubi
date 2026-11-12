import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

describe('Pharmacy catalog, statement, and invoice read', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
  let pharmacyToken = '';
  let otherPharmacyToken = '';
  let nationalProductId = 0;
  let dollarProductId = 0;
  let unavailableProductId = 0;
  let disabledProductId = 0;
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
    await configureApp(app);
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    const admin = await request(baseUrl, '/admin/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: process.env.ADMIN_MOBILE, password: process.env.ADMIN_PASSWORD },
    });
    adminToken = readString(admin.body, 'accessToken');
    const warehouse = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Catalog Warehouse ${suffix}`, address: 'Industrial Zone' },
    });
    const otherWarehouse = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Catalog Other ${suffix}`, address: 'Airport Road' },
    });
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Catalog Maker ${suffix}` },
    });
    const manufacturerId = readNumber(manufacturer.body, 'id');
    const warehouseId = readNumber(warehouse.body, 'id');
    const otherWarehouseId = readNumber(otherWarehouse.body, 'id');
    nationalProductId = await createProduct(baseUrl, adminToken, productBody({
      name: `A Catalog ${suffix}`,
      barcode: `A${suffix}`,
      manufacturerId,
      warehouseId,
      otherWarehouseId,
      category: ProductCategory.NATIONAL_MEDICINE,
      invoiceCurrency: 'SYP',
      quantity: 4,
    }));
    dollarProductId = await createProduct(baseUrl, adminToken, productBody({
      name: `B Catalog ${suffix}`,
      barcode: `B${suffix}`,
      manufacturerId,
      warehouseId,
      otherWarehouseId,
      category: ProductCategory.FOREIGN_MEDICINE,
      invoiceCurrency: 'USD',
      quantity: 20,
    }));
    unavailableProductId = await createProduct(baseUrl, adminToken, productBody({
      name: `C Catalog ${suffix}`,
      barcode: `C${suffix}`,
      manufacturerId,
      warehouseId,
      otherWarehouseId,
      category: ProductCategory.ACCESSORY,
      invoiceCurrency: 'SYP',
      quantity: 8,
    }));
    disabledProductId = await createProduct(baseUrl, adminToken, productBody({
      name: `D Catalog ${suffix}`,
      barcode: `D${suffix}`,
      manufacturerId,
      warehouseId,
      otherWarehouseId,
      category: ProductCategory.NATIONAL_MEDICINE,
      invoiceCurrency: 'SYP',
      quantity: 8,
    }));
    const unavailable = await request(baseUrl, `/admin/products/${unavailableProductId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { availability: ProductAvailability.UNAVAILABLE },
    });
    expect(unavailable.status).toBe(200);
    const disabled = await request(baseUrl, `/admin/products/${disabledProductId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: ProductStatus.DISABLED },
    });
    expect(disabled.status).toBe(200);
    const pharmacy = await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Catalog Pharmacy ${suffix}`, mobileNumber: `0994${suffix}`, address: 'Hamra Street', password: 'pharmacy-password' },
    });
    expect(pharmacy.status).toBe(201);
    const session = await request(baseUrl, '/pharmacy/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `0994${suffix}`, password: 'pharmacy-password' },
    });
    pharmacyToken = readString(session.body, 'accessToken');
    const other = await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Other Catalog Pharmacy ${suffix}`, mobileNumber: `0995${suffix}`, address: 'Baghdad Street', password: 'pharmacy-password' },
    });
    expect(other.status).toBe(201);
    const otherSession = await request(baseUrl, '/pharmacy/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `0995${suffix}`, password: 'pharmacy-password' },
    });
    otherPharmacyToken = readString(otherSession.body, 'accessToken');
  });
  afterAll(async () => {
    await app.close();
  });
  it('pages the catalog by name and barcode, and hides disabled products', async () => {
    const page = await request(baseUrl, `/pharmacy/products?search=${encodeURIComponent(suffix)}&limit=1`, { token: pharmacyToken });
    expect(page.status).toBe(200);
    expect(readNumber(page.body, 'total')).toBe(3);
    expect(readNumber(page.body, 'limit')).toBe(1);
    const first = readArray(page.body, 'items')[0];
    expect(readString(first, 'name')).toBe(`A Catalog ${suffix}`);
    expect(readString(first, 'pharmacyUnitPrice')).toBe('15000.00');
    expect(readString(first, 'consumerUnitPrice')).toBe('20000.00');
    expect(readString(first, 'invoiceCurrency')).toBe('SYP');
    expect(readNumber(first, 'availableQuantity')).toBe(4);
    expect(first.limitedQuantity).toBe(true);
    expect(first.stocks).toBeUndefined();
    expect(first.pharmacyPriceUsd).toBeUndefined();
    const byBarcode = await request(baseUrl, `/pharmacy/products?search=${encodeURIComponent(`B${suffix}`)}`, { token: pharmacyToken });
    const dollar = readArray(byBarcode.body, 'items')[0];
    expect(readNumber(dollar, 'id')).toBe(dollarProductId);
    expect(readString(dollar, 'pharmacyUnitPrice')).toBe('2.50');
    expect(readString(dollar, 'consumerUnitPrice')).toBe('3.00');
    const foreign = await request(baseUrl, `/pharmacy/products?search=${encodeURIComponent(suffix)}&category=${ProductCategory.FOREIGN_MEDICINE}`, { token: pharmacyToken });
    expect(readArray(foreign.body, 'items').map((item) => readNumber(item, 'id'))).toEqual([dollarProductId]);
    const hidden = await request(baseUrl, `/pharmacy/products/${disabledProductId}`, { token: pharmacyToken });
    expect(hidden.status).toBe(200);
    expect(readString(hidden.body, 'status')).toBe(ProductStatus.DISABLED);
    const unavailable = await request(baseUrl, `/pharmacy/products/${unavailableProductId}`, { token: pharmacyToken });
    expect(readString(unavailable.body, 'availability')).toBe(ProductAvailability.UNAVAILABLE);
    const denied = await request(baseUrl, '/pharmacy/products', { token: adminToken });
    expect(denied.status).toBe(401);
  });
  it('ranks requested products, opens the pharmacy invoice, and reads its own statement', async () => {
    const submitted = await request(baseUrl, '/pharmacy/orders', {
      method: 'POST',
      token: pharmacyToken,
      body: { items: [{ productId: nationalProductId, paidQuantity: 2 }, { productId: dollarProductId, paidQuantity: 5 }] },
    });
    expect(submitted.status).toBe(201);
    const ranked = await request(baseUrl, '/pharmacy/products/most-requested', { token: pharmacyToken });
    expect(ranked.status).toBe(200);
    const rows = readArray(ranked.body, 'items');
    expect(readNumber(rows[0], 'requestedQuantity')).toBe(5);
    expect(readNumber(readRecord(rows[0], 'product'), 'id')).toBe(dollarProductId);
    expect(readNumber(rows[1], 'requestedQuantity')).toBe(2);
    const invoiceId = readNumber(readArray(submitted.body, 'invoices')[0], 'id');
    const invoice = await request(baseUrl, `/pharmacy/invoices/${invoiceId}`, { token: pharmacyToken });
    expect(invoice.status).toBe(200);
    expect(readNumber(invoice.body, 'orderId')).toBe(readNumber(submitted.body, 'id'));
    const foreignInvoice = await request(baseUrl, `/pharmacy/invoices/${invoiceId}`, { token: otherPharmacyToken });
    expect(foreignInvoice.status).toBe(404);
    const statement = await request(baseUrl, '/pharmacy/statement', { token: pharmacyToken });
    expect(statement.status).toBe(200);
    const profile = await request(baseUrl, '/pharmacy/auth/me', { token: pharmacyToken });
    expect(readNumber(statement.body, 'pharmacyId')).toBe(readNumber(profile.body, 'id'));
    const otherStatement = await request(baseUrl, '/pharmacy/statement', { token: otherPharmacyToken });
    expect(readNumber(otherStatement.body, 'pharmacyId')).toBe(readNumber((await request(baseUrl, '/pharmacy/auth/me', { token: otherPharmacyToken })).body, 'id'));
  });
});

function productBody(input: {
  readonly name: string;
  readonly barcode: string;
  readonly manufacturerId: number;
  readonly warehouseId: number;
  readonly otherWarehouseId: number;
  readonly category: ProductCategory;
  readonly invoiceCurrency: 'USD' | 'SYP';
  readonly quantity: number;
}): object {
  return {
    name: input.name,
    barcode: input.barcode,
    manufacturerId: input.manufacturerId,
    activeIngredient: 'Paracetamol',
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 20,
    lowQuantityThreshold: 5,
    pharmacyPriceUsd: '2.50',
    pharmacyPriceSyp: '15000.00',
    consumerPriceUsd: '3.00',
    consumerPriceSyp: '20000.00',
    calculateSypFromRate: false,
    invoiceCurrency: input.invoiceCurrency,
    category: input.category,
    saleUnit: SaleUnit.PACK,
    offerActive: false,
    stocks: [
      { warehouseId: input.warehouseId, quantity: input.quantity, isPrimary: true },
      { warehouseId: input.otherWarehouseId, quantity: 9, isPrimary: false },
    ],
  };
}

async function createProduct(baseUrl: string, token: string, body: object): Promise<number> {
  const created = await request(baseUrl, '/admin/products', { method: 'POST', token, body });
  expect(created.status).toBe(201);
  return readNumber(created.body, 'id');
}

async function request(baseUrl: string, path: string, input: { method?: string; token?: string; body?: object }): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (input.body) {
    headers['content-type'] = 'application/json';
  }
  if (input.token) {
    headers.authorization = `Bearer ${input.token}`;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method: input.method ?? 'GET',
    headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const responseBody: unknown = await response.json().catch(() => null);
  return { status: response.status, body: responseBody };
}

function readString(body: unknown, key: string): string {
  if (!isRecord(body) || typeof body[key] !== 'string') {
    throw new Error(`The response did not include ${key}`);
  }
  return body[key];
}

function readNumber(body: unknown, key: string): number {
  if (!isRecord(body) || typeof body[key] !== 'number') {
    throw new Error(`The response did not include ${key}`);
  }
  return body[key];
}

function readRecord(body: unknown, key: string): Record<string, unknown> {
  if (!isRecord(body) || !isRecord(body[key])) {
    throw new Error(`The response did not include ${key}`);
  }
  return body[key];
}

function readArray(body: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(body) || !Array.isArray(body[key]) || !body[key].every(isRecord)) {
    throw new Error(`The response did not include ${key}`);
  }
  return body[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
