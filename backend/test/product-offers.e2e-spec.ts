import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { ProductCategory } from '@/modules/product/enum/product-category.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

describe('Product offers', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
  let manufacturerId = 0;
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
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Offer Maker ${suffix}` },
    });
    const warehouse = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Offer Warehouse ${suffix}`, address: 'Industrial Zone' },
    });
    manufacturerId = readNumber(manufacturer.body, 'id');
    warehouseId = readNumber(warehouse.body, 'id');
  });
  afterAll(async () => {
    await app.close();
  });
  it('stores a category, a sale unit, and an offer on that product only', async () => {
    const plain = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, warehouseId, `OFF1${suffix}`, { category: ProductCategory.ACCESSORY, saleUnit: SaleUnit.SACHET }),
    });
    expect(plain.status).toBe(201);
    expect(readString(plain.body, 'category')).toBe(ProductCategory.ACCESSORY);
    expect(readString(plain.body, 'saleUnit')).toBe(SaleUnit.SACHET);
    expect(readBoolean(plain.body, 'offerActive')).toBe(false);
    expect(readNullable(plain.body, 'offerPaidUnits')).toBeNull();
    const invalid = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, warehouseId, `OFF2${suffix}`, {
        category: ProductCategory.NATIONAL_MEDICINE,
        saleUnit: SaleUnit.PACK,
        offerActive: true,
        offerPaidUnits: 4,
        offerFreeUnits: 1,
        offerStartsAt: '2026-12-01T00:00:00.000Z',
        offerEndsAt: '2026-11-01T00:00:00.000Z',
      }),
    });
    expect(invalid.status).toBe(400);
    const offered = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(manufacturerId, warehouseId, `OFF3${suffix}`, {
        category: ProductCategory.NATIONAL_MEDICINE,
        saleUnit: SaleUnit.PACK,
        offerActive: true,
        offerPaidUnits: 4,
        offerFreeUnits: 1,
        offerStartsAt: '2026-11-01T00:00:00.000Z',
        offerEndsAt: '2026-12-01T00:00:00.000Z',
      }),
    });
    expect(offered.status).toBe(201);
    expect(readBoolean(offered.body, 'offerActive')).toBe(true);
    expect(readNumber(offered.body, 'offerPaidUnits')).toBe(4);
    expect(readNumber(offered.body, 'offerFreeUnits')).toBe(1);
    const cleared = await request(baseUrl, `/admin/products/${readNumber(offered.body, 'id')}`, {
      method: 'PATCH',
      token: adminToken,
      body: { offerActive: false },
    });
    expect(cleared.status).toBe(200);
    expect(readBoolean(cleared.body, 'offerActive')).toBe(false);
    expect(readNullable(cleared.body, 'offerFreeUnits')).toBeNull();
    expect(readString(cleared.body, 'category')).toBe(ProductCategory.NATIONAL_MEDICINE);
  });
});

function productBody(manufacturerId: number, warehouseId: number, barcode: string, extra: object): object {
  return {
    name: `Offer ${barcode}`,
    barcode,
    manufacturerId,
    activeIngredient: 'Paracetamol',
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 10,
    lowQuantityThreshold: 2,
    pharmacyPriceUsd: '1.00',
    pharmacyPriceSyp: '15000',
    consumerPriceUsd: '1.50',
    consumerPriceSyp: '20000',
    stocks: [{ warehouseId, quantity: 8 }],
    ...extra,
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

function readBoolean(body: unknown, key: string): boolean {
  if (!isRecord(body) || typeof body[key] !== 'boolean') {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
