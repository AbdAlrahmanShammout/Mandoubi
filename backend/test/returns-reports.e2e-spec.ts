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
let warehouseId = 0;

describe('Returns, reports, notifications, and audit', () => {
  let app: NestExpressApplication;
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  const from = new Date(Date.now() - 86_400_000).toISOString();
  const to = new Date(Date.now() + 86_400_000).toISOString();
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
      body: { name: `Return Warehouse ${suffix}`, address: 'Industrial Zone' },
    });
    warehouseId = readNumber(warehouse.body, 'id');
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Return Maker ${suffix}` },
    });
    const product = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readNumber(manufacturer.body, 'id'), warehouseId, `RET${suffix}`),
    });
    productId = readNumber(product.body, 'id');
    const pharmacy = await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Return Pharmacy ${suffix}`, mobileNumber: `05${suffix}`, address: 'Baghdad Street', password: 'pharmacy-password' },
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
      body: { name: `Return Driver ${suffix}`, mobileNumber: `06${suffix}`, password: 'driver-password' },
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
  it('returns stock once, sends the invoice out again, and keeps currency-grouped reports with notifications and audit', async () => {
    const missedId = await deliver(4, 'NOT_DELIVERED');
    expect(await readStock()).toEqual({ quantity: 20, reservedQuantity: 4, availableQuantity: 16 });
    const returned = await request(baseUrl, '/admin/returns', { method: 'POST', token: adminToken, body: { invoiceId: missedId } });
    expect(returned.status).toBe(200);
    expect(readString(returned.body, 'status')).toBe('RETURNED_TO_WAREHOUSE');
    expect(await readStock()).toEqual({ quantity: 20, reservedQuantity: 0, availableQuantity: 20 });
    const repeatedReturn = await request(baseUrl, '/admin/returns', { method: 'POST', token: adminToken, body: { invoiceId: missedId } });
    expect(repeatedReturn.status).toBe(400);
    expect(readString(repeatedReturn.body, 'code')).toBe('RETURN_NOT_ALLOWED');
    expect(await readStock()).toEqual({ quantity: 20, reservedQuantity: 0, availableQuantity: 20 });
    const sentAgain = await request(baseUrl, '/admin/deliveries', { method: 'POST', token: adminToken, body: { invoiceId: missedId, driverId } });
    expect(sentAgain.status).toBe(201);
    expect(readString(readRecord(sentAgain.body, 'invoice'), 'status')).toBe('OUT_FOR_DELIVERY');
    expect(await readStock()).toEqual({ quantity: 20, reservedQuantity: 4, availableQuantity: 16 });
    const open = await request(baseUrl, '/driver/deliveries', { token: driverToken });
    expect(readArray(open.body)).toHaveLength(1);
    const unpaid = await request(baseUrl, `/driver/deliveries/${missedId}/result`, {
      method: 'POST',
      token: driverToken,
      body: { result: 'DELIVERED_UNPAID', recipientName: 'Lina Hassan' },
    });
    expect(unpaid.status).toBe(200);
    expect(await readStock()).toEqual({ quantity: 16, reservedQuantity: 0, availableQuantity: 16 });
    const restockedId = await deliver(2, 'DELIVERED_UNPAID');
    expect(await readStock()).toEqual({ quantity: 14, reservedQuantity: 0, availableQuantity: 14 });
    const restocked = await request(baseUrl, '/admin/returns', { method: 'POST', token: adminToken, body: { invoiceId: restockedId } });
    expect(restocked.status).toBe(200);
    expect(await readStock()).toEqual({ quantity: 16, reservedQuantity: 0, availableQuantity: 16 });
    const secondRestock = await request(baseUrl, '/admin/returns', { method: 'POST', token: adminToken, body: { invoiceId: restockedId } });
    expect(secondRestock.status).toBe(400);
    expect(readString(secondRestock.body, 'code')).toBe('RETURN_NOT_ALLOWED');
    expect(await readStock()).toEqual({ quantity: 16, reservedQuantity: 0, availableQuantity: 16 });
    const paidId = await deliver(2, 'DELIVERED_PAID');
    const paidReturn = await request(baseUrl, '/admin/returns', { method: 'POST', token: adminToken, body: { invoiceId: paidId } });
    expect(paidReturn.status).toBe(400);
    expect(readString(paidReturn.body, 'code')).toBe('RETURN_NOT_ALLOWED');
    const statement = await request(baseUrl, `/admin/pharmacies/${pharmacyId}/statement`, { token: adminToken });
    expect(readString(readCurrency(statement.body, 'SYP'), 'outstanding')).toBe('60000.00');
    const edited = await request(baseUrl, `/admin/products/${productId}/stocks/${warehouseId}`, { method: 'PATCH', token: adminToken, body: { quantity: 12 } });
    expect(edited.status).toBe(200);
    const stockAudit = await request(baseUrl, `/admin/audit?resourceType=product&resourceId=${productId}`, { token: adminToken });
    expect(readArray(stockAudit.body).some((entry) => entry.action === 'STOCK_QUANTITY_CHANGED')).toBe(true);
    const invoiceAudit = await request(baseUrl, `/admin/audit?resourceType=invoice&resourceId=${missedId}`, { token: adminToken });
    expect(readArray(invoiceAudit.body).some((entry) => readRecord(entry, 'detail').to === 'RETURNED_TO_WAREHOUSE')).toBe(true);
    const adminNotes = await request(baseUrl, '/admin/notifications', { token: adminToken });
    expect(readArray(adminNotes.body).some((note) => note.kind === 'ORDER_SUBMITTED')).toBe(true);
    const pharmacyNotes = await request(baseUrl, '/pharmacy/notifications', { token: pharmacyToken });
    const pharmacyList = readArray(pharmacyNotes.body);
    expect(pharmacyList.some((note) => note.kind === 'INVOICE_APPROVED')).toBe(true);
    expect(pharmacyList.some((note) => note.kind === 'AMOUNT_DUE')).toBe(true);
    const noteId = readNumber(pharmacyList[0], 'id');
    const marked = await request(baseUrl, `/pharmacy/notifications/${noteId}/read`, { method: 'POST', token: pharmacyToken });
    expect(marked.status).toBe(200);
    expect(readNullable(marked.body, 'readAt')).not.toBeNull();
    const period = `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const sales = await request(baseUrl, `/admin/reports/sales?${period}&pharmacyId=${pharmacyId}`, { token: adminToken });
    expect(sales.status).toBe(200);
    expect(readString(readCurrency(sales.body, 'SYP', 'totals'), 'amount')).toBe('90000.00');
    const products = await request(baseUrl, `/admin/reports/products?${period}`, { token: adminToken });
    expect(readArray(products.body, 'bestSellers').some((seller) => readNumber(seller, 'productId') === productId)).toBe(true);
    const debts = await request(baseUrl, `/admin/reports/debts?${period}`, { token: adminToken });
    const balance = readArray(debts.body, 'balances').find((item) => readNumber(item, 'pharmacyId') === pharmacyId);
    expect(readString(balance, 'outstanding')).toBe('60000.00');
    expect(readString(balance, 'currency')).toBe('SYP');
    const drivers = await request(baseUrl, '/admin/reports/drivers', { token: adminToken });
    const row = readArray(drivers.body).find((item) => readNumber(item, 'driverId') === driverId);
    expect(row).toBeDefined();
    expect(readNumber(row, 'deliveredPaidCount')).toBe(1);
    expect(readNumber(row, 'deliveredUnpaidCount')).toBe(1);
    expect(readString(readCurrency(row, 'SYP', 'holdings'), 'held')).toBe('30000.00');
  });
});

async function deliver(paidQuantity: number, result: 'NOT_DELIVERED' | 'DELIVERED_UNPAID' | 'DELIVERED_PAID'): Promise<number> {
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
  const body = result === 'NOT_DELIVERED' ? { result, nonDeliveryReason: 'PHARMACY_CLOSED' } : { result, recipientName: 'Lina Hassan' };
  const delivered = await request(baseUrl, `/driver/deliveries/${invoiceId}/result`, { method: 'POST', token: driverToken, body });
  expect(delivered.status).toBe(200);
  return invoiceId;
}

async function readStock(): Promise<{ quantity: number; reservedQuantity: number; availableQuantity: number }> {
  const product = await request(baseUrl, `/admin/products/${productId}`, { token: adminToken });
  const stock = readArray(product.body, 'stocks')[0];
  return {
    quantity: readNumber(stock, 'quantity'),
    reservedQuantity: readNumber(stock, 'reservedQuantity'),
    availableQuantity: readNumber(stock, 'availableQuantity'),
  };
}

function productBody(manufacturerId: number, primaryWarehouseId: number, barcode: string): object {
  return {
    name: `Return ${barcode}`,
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
    stocks: [{ warehouseId: primaryWarehouseId, quantity: 20 }],
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

function readNullable(body: unknown, key: string): unknown {
  if (!isRecord(body) || !(key in body)) {
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
