import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

describe('Invoice approval and stock reservation', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
  let pharmacyToken = '';
  let primaryWarehouseId = 0;
  let otherWarehouseId = 0;
  let nationalProductId = 0;
  let foreignProductId = 0;
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
      body: { name: `Reserve Primary ${suffix}`, address: 'Industrial Zone' },
    });
    const other = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Reserve Other ${suffix}`, address: 'Airport Road' },
    });
    primaryWarehouseId = readNumber(primary.body, 'id');
    otherWarehouseId = readNumber(other.body, 'id');
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Reserve Maker ${suffix}` },
    });
    const manufacturerId = readNumber(manufacturer.body, 'id');
    const national = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, primaryWarehouseId, otherWarehouseId, `RSVN${suffix}`, ProductCategory.NATIONAL_MEDICINE, true, 10),
    });
    const foreign = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, primaryWarehouseId, otherWarehouseId, `RSVF${suffix}`, ProductCategory.FOREIGN_MEDICINE, false, 8),
    });
    nationalProductId = readNumber(national.body, 'id');
    foreignProductId = readNumber(foreign.body, 'id');
    await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Reserve Pharmacy ${suffix}`, mobileNumber: `08${suffix}`, address: 'Baghdad Street', password: 'pharmacy-password' },
    });
    const session = await request(baseUrl, '/pharmacy/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `08${suffix}`, password: 'pharmacy-password' },
    });
    pharmacyToken = readString(session.body, 'accessToken');
  });
  afterAll(async () => {
    await app.close();
  });
  it('reserves the recorded warehouse on approval and leaves stock unchanged on rejection', async () => {
    const first = await request(baseUrl, '/pharmacy/orders', {
      method: 'POST',
      token: pharmacyToken,
      body: {
        items: [
          { productId: nationalProductId, paidQuantity: 8 },
          { productId: foreignProductId, paidQuantity: 2 },
        ],
      },
    });
    expect(first.status).toBe(201);
    const second = await request(baseUrl, '/pharmacy/orders', {
      method: 'POST',
      token: pharmacyToken,
      body: { items: [{ productId: nationalProductId, paidQuantity: 4 }] },
    });
    expect(second.status).toBe(201);
    const nationalInvoice = findInvoice(first.body, ProductCategory.NATIONAL_MEDICINE);
    const foreignInvoice = findInvoice(first.body, ProductCategory.FOREIGN_MEDICINE);
    const secondInvoice = findInvoice(second.body, ProductCategory.NATIONAL_MEDICINE);
    const approved = await request(baseUrl, `/admin/invoices/${readNumber(nationalInvoice, 'id')}/approve`, { method: 'POST', token: adminToken, body: {} });
    expect(approved.status).toBe(200);
    expect(readString(approved.body, 'status')).toBe('APPROVED');
    const repeated = await request(baseUrl, `/admin/invoices/${readNumber(nationalInvoice, 'id')}/approve`, { method: 'POST', token: adminToken, body: {} });
    expect(repeated.status).toBe(400);
    expect(readString(repeated.body, 'code')).toBe('INVOICE_NOT_PENDING');
    const blocked = await request(baseUrl, `/admin/invoices/${readNumber(secondInvoice, 'id')}/approve`, { method: 'POST', token: adminToken, body: {} });
    expect(blocked.status).toBe(400);
    expect(readString(blocked.body, 'code')).toBe('INSUFFICIENT_STOCK');
    const reason = await request(baseUrl, '/admin/rejection-reasons', {
      method: 'POST',
      token: adminToken,
      body: { label: `Out of stock ${suffix}` },
    });
    expect(reason.status).toBe(201);
    const rejected = await request(baseUrl, `/admin/invoices/${readNumber(secondInvoice, 'id')}/reject`, {
      method: 'POST',
      token: adminToken,
      body: { rejectionReasonId: readNumber(reason.body, 'id'), customReason: 'Call tomorrow' },
    });
    expect(rejected.status).toBe(200);
    expect(readString(rejected.body, 'status')).toBe('REJECTED');
    expect(readString(rejected.body, 'rejectionReasonLabel')).toBe(`Out of stock ${suffix}`);
    expect(readString(rejected.body, 'customReason')).toBe('Call tomorrow');
    const untouched = await request(baseUrl, `/admin/invoices/${readNumber(foreignInvoice, 'id')}/reject`, { method: 'POST', token: adminToken, body: {} });
    expect(untouched.status).toBe(200);
    expect(readNullable(untouched.body, 'rejectionReasonId')).toBeNull();
    const order = await request(baseUrl, `/pharmacy/orders/${readNumber(first.body, 'id')}`, { token: pharmacyToken });
    expect(readString(order.body, 'status')).toBe('PARTIALLY_APPROVED');
    const product = await request(baseUrl, `/admin/products/${nationalProductId}`, { token: adminToken });
    const primary = findStock(product.body, primaryWarehouseId);
    const other = findStock(product.body, otherWarehouseId);
    expect(readNumber(primary, 'quantity')).toBe(10);
    expect(readNumber(primary, 'reservedQuantity')).toBe(10);
    expect(readNumber(primary, 'availableQuantity')).toBe(0);
    expect(readNumber(other, 'quantity')).toBe(40);
    expect(readNumber(other, 'reservedQuantity')).toBe(0);
    const lowered = await request(baseUrl, `/admin/products/${nationalProductId}/stocks/${primaryWarehouseId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { quantity: 9 },
    });
    expect(lowered.status).toBe(400);
    const moved = await request(baseUrl, `/admin/products/${nationalProductId}/primary-warehouse`, {
      method: 'PATCH',
      token: adminToken,
      body: { warehouseId: otherWarehouseId },
    });
    expect(moved.status).toBe(200);
    const afterMove = await request(baseUrl, `/admin/products/${nationalProductId}`, { token: adminToken });
    expect(readNumber(findStock(afterMove.body, primaryWarehouseId), 'reservedQuantity')).toBe(10);
    expect(readNumber(findStock(afterMove.body, otherWarehouseId), 'reservedQuantity')).toBe(0);
    const foreignProduct = await request(baseUrl, `/admin/products/${foreignProductId}`, { token: adminToken });
    expect(readNumber(findStock(foreignProduct.body, primaryWarehouseId), 'quantity')).toBe(8);
    expect(readNumber(findStock(foreignProduct.body, primaryWarehouseId), 'reservedQuantity')).toBe(0);
  });
});

function productBody(manufacturerId: number, primaryWarehouseId: number, otherWarehouseId: number, barcode: string, category: ProductCategory, offerActive: boolean, primaryQuantity: number): object {
  return {
    name: `Reserve ${barcode}`,
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
      { warehouseId: primaryWarehouseId, quantity: primaryQuantity, isPrimary: true },
      { warehouseId: otherWarehouseId, quantity: 40, isPrimary: false },
    ],
  };
}

function findInvoice(body: unknown, category: string): Record<string, unknown> {
  const invoice = readArray(body, 'invoices').find((item) => item.category === category);
  if (!invoice) {
    throw new Error(`The ${category} invoice was missing`);
  }
  return invoice;
}

function findStock(body: unknown, warehouseId: number): Record<string, unknown> {
  const stock = readArray(body, 'stocks').find((item) => item.warehouseId === warehouseId);
  if (!stock) {
    throw new Error(`The warehouse ${warehouseId} stock was missing`);
  }
  return stock;
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

function readNullable(body: unknown, key: string): unknown {
  if (!isRecord(body) || !(key in body)) {
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
