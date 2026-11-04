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
let otherDriverToken = '';
let driverId = 0;
let productId = 0;

describe('Delivery assignments', () => {
  let app: NestExpressApplication;
  let warehouseId = 0;
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
      body: { name: `Delivery Warehouse ${suffix}`, address: 'Industrial Zone' },
    });
    warehouseId = readNumber(warehouse.body, 'id');
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Delivery Maker ${suffix}` },
    });
    const product = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readNumber(manufacturer.body, 'id'), warehouseId, `DLV${suffix}`),
    });
    productId = readNumber(product.body, 'id');
    await request(baseUrl, '/admin/pharmacies', {
      method: 'POST',
      token: adminToken,
      body: { name: `Delivery Pharmacy ${suffix}`, mobileNumber: `05${suffix}`, address: 'Baghdad Street', password: 'pharmacy-password' },
    });
    const pharmacy = await request(baseUrl, '/pharmacy/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `05${suffix}`, password: 'pharmacy-password' },
    });
    pharmacyToken = readString(pharmacy.body, 'accessToken');
    const driver = await request(baseUrl, '/admin/drivers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Driver ${suffix}`, mobileNumber: `06${suffix}`, password: 'driver-password' },
    });
    driverId = readNumber(driver.body, 'id');
    const session = await request(baseUrl, '/driver/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `06${suffix}`, password: 'driver-password' },
    });
    driverToken = readString(session.body, 'accessToken');
    await request(baseUrl, '/admin/drivers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Other Driver ${suffix}`, mobileNumber: `07${suffix}`, password: 'driver-password' },
    });
    const other = await request(baseUrl, '/driver/auth/sign-in', {
      method: 'POST',
      body: { mobileNumber: `07${suffix}`, password: 'driver-password' },
    });
    otherDriverToken = readString(other.body, 'accessToken');
  });
  afterAll(async () => {
    await app.close();
  });
  it('assigns an approved invoice and issues reserved stock only when it is delivered', async () => {
    const firstInvoiceId = await submitAndReadInvoice(4);
    const tooEarly = await request(baseUrl, '/admin/deliveries', {
      method: 'POST',
      token: adminToken,
      body: { invoiceId: firstInvoiceId, driverId },
    });
    expect(tooEarly.status).toBe(400);
    expect(readString(tooEarly.body, 'code')).toBe('INVOICE_NOT_APPROVED');
    await approve(firstInvoiceId);
    const assigned = await request(baseUrl, '/admin/deliveries', {
      method: 'POST',
      token: adminToken,
      body: { invoiceId: firstInvoiceId, driverId },
    });
    expect(assigned.status).toBe(201);
    expect(readString(readRecord(assigned.body, 'invoice'), 'status')).toBe('ASSIGNED');
    expect(readString(assigned.body, 'pharmacyName')).toBe(`Delivery Pharmacy ${suffix}`);
    expect(readString(assigned.body, 'pharmacyAddress')).toBe('Baghdad Street');
    const hidden = await request(baseUrl, '/driver/deliveries', { token: otherDriverToken });
    expect(hidden.status).toBe(200);
    expect(readArray(hidden.body)).toEqual([]);
    const tasks = await request(baseUrl, '/driver/deliveries', { token: driverToken });
    expect(readArray(tasks.body)).toHaveLength(1);
    const refused = await request(baseUrl, '/admin/deliveries', { method: 'POST', token: driverToken, body: { invoiceId: firstInvoiceId, driverId } });
    expect(refused.status).toBe(403);
    const delivered = await request(baseUrl, `/driver/deliveries/${firstInvoiceId}/result`, {
      method: 'POST',
      token: driverToken,
      body: { result: 'DELIVERED_PAID', recipientName: 'Lina Hassan', note: 'Paid in cash' },
    });
    expect(delivered.status).toBe(200);
    expect(readString(delivered.body, 'invoiceStatus')).toBe('DELIVERED_PAID');
    expect(readString(delivered.body, 'recipientName')).toBe('Lina Hassan');
    const sameResult = await request(baseUrl, `/driver/deliveries/${firstInvoiceId}/result`, {
      method: 'POST',
      token: driverToken,
      body: { result: 'DELIVERED_PAID', recipientName: 'Lina Hassan', note: 'Paid in cash' },
    });
    expect(sameResult.status).toBe(200);
    expect(readNumber(sameResult.body, 'id')).toBe(readNumber(delivered.body, 'id'));
    expect(await readStock()).toEqual({ quantity: 6, reservedQuantity: 0, availableQuantity: 6 });
    const position = await request(baseUrl, `/admin/drivers/${driverId}/settlement`, { token: adminToken });
    expect(readArray(position.body, 'collections')).toHaveLength(1);
    expect(readString(readArray(position.body, 'holdings')[0], 'held')).toBe('60000.00');
    const repeated = await request(baseUrl, `/driver/deliveries/${firstInvoiceId}/result`, {
      method: 'POST',
      token: driverToken,
      body: { result: 'DELIVERED_UNPAID', recipientName: 'Lina Hassan' },
    });
    expect(repeated.status).toBe(400);
    expect(readString(repeated.body, 'code')).toBe('INVOICE_NOT_ASSIGNED');
    expect(await readStock()).toEqual({ quantity: 6, reservedQuantity: 0, availableQuantity: 6 });
    const secondInvoiceId = await submitAndReadInvoice(2);
    await approve(secondInvoiceId);
    const secondAssignment = await request(baseUrl, '/admin/deliveries', {
      method: 'POST',
      token: adminToken,
      body: { invoiceId: secondInvoiceId, driverId },
    });
    expect(secondAssignment.status).toBe(201);
    const missed = await request(baseUrl, `/driver/deliveries/${secondInvoiceId}/result`, {
      method: 'POST',
      token: driverToken,
      body: { result: 'NOT_DELIVERED', nonDeliveryReason: 'PHARMACY_CLOSED' },
    });
    expect(missed.status).toBe(200);
    expect(readString(missed.body, 'nonDeliveryReason')).toBe('PHARMACY_CLOSED');
    expect(readNullable(missed.body, 'recipientName')).toBeNull();
    expect(await readStock()).toEqual({ quantity: 6, reservedQuantity: 2, availableQuantity: 4 });
    const open = await request(baseUrl, '/driver/deliveries', { token: driverToken });
    expect(readArray(open.body)).toEqual([]);
  });
});

async function submitAndReadInvoice(paidQuantity: number): Promise<number> {
  const submitted = await request(baseUrl, '/pharmacy/orders', {
    method: 'POST',
    token: pharmacyToken,
    body: { items: [{ productId, paidQuantity }] },
  });
  expect(submitted.status).toBe(201);
  return readNumber(readArray(submitted.body, 'invoices')[0], 'id');
}

async function approve(invoiceId: number): Promise<void> {
  const approved = await request(baseUrl, `/admin/invoices/${invoiceId}/approve`, { method: 'POST', token: adminToken, body: {} });
  expect(approved.status).toBe(200);
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

function productBody(manufacturerId: number, warehouseId: number, barcode: string): object {
  return {
    name: `Delivery ${barcode}`,
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
