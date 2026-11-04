import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

describe('Currencies', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
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
  });
  afterAll(async () => {
    await app.close();
  });
  it('calculates Syrian-pound prices from the exchange rate only while the switch is on', async () => {
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Currency Maker ${suffix}` },
    });
    const warehouse = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Currency Warehouse ${suffix}`, address: 'Industrial Zone' },
    });
    const manufacturerId = readNumber(manufacturer.body, 'id');
    const warehouseId = readNumber(warehouse.body, 'id');
    const missingRate = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, warehouseId, `CUR1${suffix}`, { calculateSypFromRate: true, pharmacyPriceUsd: '2', consumerPriceUsd: '3' }),
    });
    if (missingRate.status !== 400) {
      await request(baseUrl, '/admin/exchange-rate', { method: 'PUT', token: adminToken, body: { usdToSyp: '15000' } });
    }
    const rate = await request(baseUrl, '/admin/exchange-rate', { method: 'PUT', token: adminToken, body: { usdToSyp: '15000' } });
    expect(rate.status).toBe(200);
    const calculated = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, warehouseId, `CUR2${suffix}`, { calculateSypFromRate: true, pharmacyPriceUsd: '2', consumerPriceUsd: '3' }),
    });
    expect(calculated.status).toBe(201);
    expect(readString(calculated.body, 'pharmacyPriceSyp')).toBe('30000.00');
    expect(readString(calculated.body, 'consumerPriceSyp')).toBe('45000.00');
    expect(readString(calculated.body, 'invoiceCurrency')).toBe(InvoiceCurrency.SYP);
    const fixed = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, warehouseId, `CUR3${suffix}`, {
        calculateSypFromRate: false,
        pharmacyPriceUsd: '1',
        pharmacyPriceSyp: '100',
        consumerPriceUsd: '2',
        consumerPriceSyp: '200',
        invoiceCurrency: InvoiceCurrency.USD,
      }),
    });
    expect(fixed.status).toBe(201);
    expect(readString(fixed.body, 'invoiceCurrency')).toBe(InvoiceCurrency.USD);
    const updatedRate = await request(baseUrl, '/admin/exchange-rate', { method: 'PUT', token: adminToken, body: { usdToSyp: '16000' } });
    expect(updatedRate.status).toBe(200);
    const calculatedAfter = await request(baseUrl, `/admin/products/${readNumber(calculated.body, 'id')}`, { token: adminToken });
    const fixedAfter = await request(baseUrl, `/admin/products/${readNumber(fixed.body, 'id')}`, { token: adminToken });
    expect(readString(calculatedAfter.body, 'pharmacyPriceSyp')).toBe('32000.00');
    expect(readString(calculatedAfter.body, 'consumerPriceSyp')).toBe('48000.00');
    expect(readString(fixedAfter.body, 'pharmacyPriceSyp')).toBe('100.00');
    expect(readString(fixedAfter.body, 'consumerPriceSyp')).toBe('200.00');
  });
});

function productBody(manufacturerId: number, warehouseId: number, barcode: string, prices: object): object {
  return {
    name: `Currency ${barcode}`,
    barcode,
    manufacturerId,
    activeIngredient: 'Paracetamol',
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 10,
    lowQuantityThreshold: 2,
    stocks: [{ warehouseId, quantity: 8 }],
    ...prices,
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
  const body: unknown = await response.json();
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
