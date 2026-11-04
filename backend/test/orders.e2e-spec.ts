import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

describe('Orders and invoice snapshots', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
  let pharmacyToken = '';
  let primaryWarehouseId = 0;
  let otherWarehouseId = 0;
  let nationalProductId = 0;
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
    const primary = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Order Primary ${suffix}`, address: 'Industrial Zone' },
    });
    const other = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Order Other ${suffix}`, address: 'Airport Road' },
    });
    primaryWarehouseId = readNumber(primary.body, 'id');
    otherWarehouseId = readNumber(other.body, 'id');
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Order Maker ${suffix}` },
    });
    const manufacturerId = readNumber(manufacturer.body, 'id');
    const national = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, primaryWarehouseId, otherWarehouseId, `ORDN${suffix}`, ProductCategory.NATIONAL_MEDICINE, true),
    });
    nationalProductId = readNumber(national.body, 'id');
    await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, primaryWarehouseId, otherWarehouseId, `ORDF${suffix}`, ProductCategory.FOREIGN_MEDICINE, false),
    });
    const pharmacy = await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Order Pharmacy ${suffix}`, mobileNumber: `09${suffix}`, address: 'Baghdad Street', password: 'pharmacy-password' },
    });
    expect(pharmacy.status).toBe(201);
    const session = await request(baseUrl, '/pharmacy/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `09${suffix}`, password: 'pharmacy-password' },
    });
    pharmacyToken = readString(session.body, 'accessToken');
  });
  afterAll(async () => {
    await app.close();
  });
  it('splits one order into category invoices and keeps the snapshot after later edits', async () => {
    const foreignId = await findProductId(baseUrl, adminToken, `ORDF${suffix}`);
    const tooLarge = await request(baseUrl, '/pharmacy/orders', {
      method: 'POST',
      token: pharmacyToken,
      body: { items: [{ productId: nationalProductId, paidQuantity: 21 }] },
    });
    expect(tooLarge.status).toBe(400);
    const submitted = await request(baseUrl, '/pharmacy/orders', {
      method: 'POST',
      token: pharmacyToken,
      body: {
        items: [
          { productId: nationalProductId, paidQuantity: 8 },
          { productId: foreignId, paidQuantity: 2 },
        ],
      },
    });
    expect(submitted.status).toBe(201);
    expect(readString(submitted.body, 'status')).toBe('PENDING');
    expect(readNumber(submitted.body, 'invoiceCount')).toBe(2);
    const invoices = readArray(submitted.body, 'invoices');
    const national = invoices.find((invoice) => readString(invoice, 'category') === ProductCategory.NATIONAL_MEDICINE);
    const foreign = invoices.find((invoice) => readString(invoice, 'category') === ProductCategory.FOREIGN_MEDICINE);
    if (!national || !foreign) {
      throw new Error('The order did not split by category');
    }
    const nationalItem = readArray(national, 'items')[0];
    expect(readNumber(nationalItem, 'freeQuantity')).toBe(2);
    expect(readNumber(nationalItem, 'totalQuantity')).toBe(10);
    expect(readNumber(nationalItem, 'paidQuantity')).toBe(8);
    expect(readString(nationalItem, 'unitPrice')).toBe('15000.00');
    expect(readString(nationalItem, 'currency')).toBe('SYP');
    expect(readNumber(nationalItem, 'primaryWarehouseId')).toBe(primaryWarehouseId);
    expect(readNumber(nationalItem, 'offerPaidUnits')).toBe(4);
    const orderId = readNumber(submitted.body, 'id');
    const repriced = await request(baseUrl, `/admin/products/${nationalProductId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { pharmacyPriceSyp: '99999.00', pharmacyPriceUsd: '9.00' },
    });
    expect(repriced.status).toBe(200);
    const moved = await request(baseUrl, `/admin/products/${nationalProductId}/primary-warehouse`, {
      method: 'PATCH',
      token: adminToken,
      body: { warehouseId: otherWarehouseId },
    });
    expect(moved.status).toBe(200);
    const reread = await request(baseUrl, `/pharmacy/orders/${orderId}`, { token: pharmacyToken });
    expect(reread.status).toBe(200);
    const stored = readArray(reread.body, 'invoices').find((invoice) => readString(invoice, 'category') === ProductCategory.NATIONAL_MEDICINE);
    if (!stored) {
      throw new Error('The stored invoice was missing');
    }
    const storedItem = readArray(stored, 'items')[0];
    expect(readString(storedItem, 'unitPrice')).toBe('15000.00');
    expect(readNumber(storedItem, 'primaryWarehouseId')).toBe(primaryWarehouseId);
    const adminList = await request(baseUrl, '/admin/orders', { token: adminToken });
    expect(adminList.status).toBe(200);
    const adminInvoice = await request(baseUrl, `/admin/invoices/${readNumber(national, 'id')}`, { token: adminToken });
    expect(adminInvoice.status).toBe(200);
    expect(readString(adminInvoice.body, 'status')).toBe('PENDING');
    const hidden = await request(baseUrl, `/pharmacy/orders/${orderId}`, { token: adminToken });
    expect(hidden.status).toBe(401);
  });
});

function productBody(manufacturerId: number, primaryWarehouseId: number, otherWarehouseId: number, barcode: string, category: ProductCategory, offerActive: boolean): object {
  return {
    name: `Order ${barcode}`,
    barcode,
    manufacturerId,
    activeIngredient: 'Paracetamol',
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 20,
    lowQuantityThreshold: 2,
    pharmacyPriceUsd: '2.50',
    pharmacyPriceSyp: '15000.00',
    consumerPriceUsd: '3.00',
    consumerPriceSyp: '20000.00',
    calculateSypFromRate: false,
    invoiceCurrency: 'SYP',
    category,
    saleUnit: SaleUnit.PACK,
    offerActive,
    offerPaidUnits: offerActive ? 4 : undefined,
    offerFreeUnits: offerActive ? 1 : undefined,
    offerStartsAt: offerActive ? '2026-11-01T00:00:00.000Z' : undefined,
    offerEndsAt: offerActive ? '2026-12-01T00:00:00.000Z' : undefined,
    stocks: [
      { warehouseId: primaryWarehouseId, quantity: 30, isPrimary: true },
      { warehouseId: otherWarehouseId, quantity: 5, isPrimary: false },
    ],
  };
}

async function findProductId(baseUrl: string, token: string, barcode: string): Promise<number> {
  const listed = await request(baseUrl, '/admin/products', { token });
  const products = Array.isArray(listed.body) ? listed.body : [];
  const match = products.find((product) => isRecord(product) && product.barcode === barcode);
  if (!isRecord(match) || typeof match.id !== 'number') {
    throw new Error(`Product ${barcode} was not created`);
  }
  return match.id;
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
  const body: unknown = await response.json().catch(() => null);
  return { status: response.status, body };
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

function readArray(body: unknown, key: string): Record<string, unknown>[] {
  if (!isRecord(body) || !Array.isArray(body[key]) || !body[key].every(isRecord)) {
    throw new Error(`The response did not include ${key}`);
  }
  return body[key];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
