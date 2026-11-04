import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

let baseUrl = '';
let adminToken = '';
let pharmacyToken = '';
let driverToken = '';
let pharmacyId = 0;
let driverId = 0;
let productId = 0;

describe('Pharmacy receipts and driver settlement', () => {
  let app: NestExpressApplication;
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
      body: { name: `Ledger Warehouse ${suffix}`, address: 'Industrial Zone' },
    });
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Ledger Maker ${suffix}` },
    });
    const product = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readNumber(manufacturer.body, 'id'), readNumber(warehouse.body, 'id'), `LDG${suffix}`),
    });
    productId = readNumber(product.body, 'id');
    const pharmacy = await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Ledger Pharmacy ${suffix}`, mobileNumber: `05${suffix}`, address: 'Baghdad Street', password: 'pharmacy-password' },
    });
    pharmacyId = readNumber(pharmacy.body, 'id');
    const pharmacySession = await request(baseUrl, '/pharmacy/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `05${suffix}`, password: 'pharmacy-password' },
    });
    pharmacyToken = readString(pharmacySession.body, 'accessToken');
    const driver = await request(baseUrl, '/admin/drivers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Ledger Driver ${suffix}`, mobileNumber: `06${suffix}`, password: 'driver-password' },
    });
    driverId = readNumber(driver.body, 'id');
    const driverSession = await request(baseUrl, '/driver/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `06${suffix}`, password: 'driver-password' },
    });
    driverToken = readString(driverSession.body, 'accessToken');
  });
  afterAll(async () => {
    await app.close();
  });
  it('keeps a delivered unpaid invoice due until a whole receipt covers it, and settles the driver collection', async () => {
    const unpaidInvoiceId = await deliver(4, 'DELIVERED_UNPAID');
    const due = await request(baseUrl, `/admin/pharmacies/${pharmacyId}/statement`, { token: adminToken });
    expect(due.status).toBe(200);
    expect(readString(readCurrency(due.body, 'SYP'), 'outstanding')).toBe('60000.00');
    expect(readString(readCurrency(due.body, 'SYP'), 'openingBalance')).toBe('0.00');
    expect(readArray(due.body, 'unpaidInvoices')).toHaveLength(1);
    expect(readNumber(readArray(due.body, 'unpaidInvoices')[0], 'invoiceId')).toBe(unpaidInvoiceId);
    const partial = await request(baseUrl, '/admin/receipts', {
      method: 'POST',
      token: adminToken,
      body: { pharmacyId, currency: 'SYP', amount: '1000.00', receivedByName: 'Ahmad Cashier', invoiceIds: [unpaidInvoiceId] },
    });
    expect(partial.status).toBe(400);
    expect(readString(partial.body, 'code')).toBe('RECEIPT_AMOUNT_MISMATCH');
    const receipt = await request(baseUrl, '/admin/receipts', {
      method: 'POST',
      token: adminToken,
      body: { pharmacyId, currency: 'SYP', amount: '60000.00', receivedByName: 'Ahmad Cashier', invoiceIds: [unpaidInvoiceId] },
    });
    expect(receipt.status).toBe(201);
    expect(readString(receipt.body, 'amount')).toBe('60000.00');
    const repeated = await request(baseUrl, '/admin/receipts', {
      method: 'POST',
      token: adminToken,
      body: { pharmacyId, currency: 'SYP', amount: '60000.00', receivedByName: 'Ahmad Cashier', invoiceIds: [unpaidInvoiceId] },
    });
    expect(repeated.status).toBe(409);
    expect(readString(repeated.body, 'code')).toBe('INVOICE_ALREADY_PAID');
    const invoice = await request(baseUrl, `/admin/invoices/${unpaidInvoiceId}`, { token: adminToken });
    expect(readString(invoice.body, 'status')).toBe('DELIVERED_UNPAID');
    const paidInvoiceId = await deliver(2, 'DELIVERED_PAID');
    const covered = await request(baseUrl, '/admin/receipts', {
      method: 'POST',
      token: adminToken,
      body: { pharmacyId, currency: 'SYP', amount: '30000.00', receivedByName: 'Ahmad Cashier', invoiceIds: [paidInvoiceId] },
    });
    expect(covered.status).toBe(400);
    expect(readString(covered.body, 'code')).toBe('INVOICE_NOT_DUE');
    const cleared = await request(baseUrl, `/admin/pharmacies/${pharmacyId}/statement`, { token: adminToken });
    expect(readString(readCurrency(cleared.body, 'SYP'), 'charges')).toBe('90000.00');
    expect(readString(readCurrency(cleared.body, 'SYP'), 'payments')).toBe('90000.00');
    expect(readString(readCurrency(cleared.body, 'SYP'), 'outstanding')).toBe('0.00');
    expect(readArray(cleared.body, 'unpaidInvoices')).toEqual([]);
    const holding = await request(baseUrl, `/admin/drivers/${driverId}/settlement`, { token: adminToken });
    expect(holding.status).toBe(200);
    expect(readNumber(holding.body, 'assignedCount')).toBe(2);
    expect(readNumber(holding.body, 'deliveredPaidCount')).toBe(1);
    expect(readNumber(holding.body, 'deliveredUnpaidCount')).toBe(1);
    expect(readString(readCurrency(holding.body, 'SYP', 'holdings'), 'held')).toBe('30000.00');
    const paymentId = readNumber(readArray(holding.body, 'collections')[0], 'paymentId');
    const short = await request(baseUrl, '/admin/driver-settlements', {
      method: 'POST',
      token: adminToken,
      body: { driverId, currency: 'SYP', amount: '1000.00', receivedByName: 'Ahmad Cashier', paymentIds: [paymentId] },
    });
    expect(short.status).toBe(400);
    expect(readString(short.body, 'code')).toBe('SETTLEMENT_AMOUNT_MISMATCH');
    const handover = await request(baseUrl, '/admin/driver-settlements', {
      method: 'POST',
      token: adminToken,
      body: { driverId, currency: 'SYP', amount: '30000.00', receivedByName: 'Ahmad Cashier', paymentIds: [paymentId] },
    });
    expect(handover.status).toBe(201);
    const settled = await request(baseUrl, `/admin/drivers/${driverId}/settlement`, { token: adminToken });
    expect(readString(readCurrency(settled.body, 'SYP', 'holdings'), 'handedOver')).toBe('30000.00');
    expect(readString(readCurrency(settled.body, 'SYP', 'holdings'), 'held')).toBe('0.00');
    const again = await request(baseUrl, '/admin/driver-settlements', {
      method: 'POST',
      token: adminToken,
      body: { driverId, currency: 'SYP', amount: '30000.00', receivedByName: 'Ahmad Cashier', paymentIds: [paymentId] },
    });
    expect(again.status).toBe(400);
    expect(readString(again.body, 'code')).toBe('COLLECTION_ALREADY_SETTLED');
  });
});

async function deliver(paidQuantity: number, result: 'DELIVERED_UNPAID' | 'DELIVERED_PAID'): Promise<number> {
  const submitted = await request(baseUrl, '/pharmacy/orders', {
    method: 'POST',
    token: pharmacyToken,
    body: { items: [{ productId, paidQuantity }] },
  });
  expect(submitted.status).toBe(201);
  const invoiceId = readNumber(readArray(submitted.body, 'invoices')[0], 'id');
  const approved = await request(baseUrl, `/admin/invoices/${invoiceId}/approve`, { method: 'POST', token: adminToken, body: {} });
  expect(approved.status).toBe(200);
  const assigned = await request(baseUrl, '/admin/deliveries', { method: 'POST', token: adminToken, body: { invoiceId, driverId } });
  expect(assigned.status).toBe(201);
  const delivered = await request(baseUrl, `/driver/deliveries/${invoiceId}/result`, {
    method: 'POST',
    token: driverToken,
    body: { result, recipientName: 'Lina Hassan' },
  });
  expect(delivered.status).toBe(200);
  return invoiceId;
}

function productBody(manufacturerId: number, warehouseId: number, barcode: string): object {
  return {
    name: `Ledger ${barcode}`,
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
    category: ProductCategory.NATIONAL_MEDICINE,
    saleUnit: SaleUnit.PACK,
    stocks: [{ warehouseId, quantity: 10 }],
  };
}

async function request(url: string, path: string, input: { method?: string; token?: string; body?: object }): Promise<{ status: number; body: unknown }> {
  const headers: Record<string, string> = {};
  if (input.body) {
    headers['content-type'] = 'application/json';
  }
  if (input.token) {
    headers.authorization = `Bearer ${input.token}`;
  }
  const response = await fetch(`${url}${path}`, {
    method: input.method ?? 'GET',
    headers,
    body: input.body ? JSON.stringify(input.body) : undefined,
  });
  const body: unknown = await response.json().catch(() => null);
  return { status: response.status, body };
}

function readCurrency(body: unknown, currency: string, key = 'currencies'): Record<string, unknown> {
  const match = readArray(body, key).find((item) => item.currency === currency);
  if (!match) {
    throw new Error(`The response did not include ${currency}`);
  }
  return match;
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

function readArray(body: unknown, key?: string): Record<string, unknown>[] {
  const value = key === undefined ? body : isRecord(body) ? body[key] : undefined;
  if (!Array.isArray(value) || !value.every(isRecord)) {
    throw new Error(`The response did not include ${key ?? 'a list'}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
