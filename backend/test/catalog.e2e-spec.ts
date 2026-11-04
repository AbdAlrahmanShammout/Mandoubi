import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { ManufacturerStatus } from '@/modules/manufacturer/enum/manufacturer-status.enum';

describe('Catalog', () => {
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
    adminToken = readToken(admin.body);
  });
  afterAll(async () => {
    await app.close();
  });
  it('stores one product in many warehouses and keeps a single primary warehouse', async () => {
    const manufacturer = await request(baseUrl, '/admin/manufacturers', {
      method: 'POST',
      token: adminToken,
      body: { name: `Maker ${suffix}` },
    });
    expect(manufacturer.status).toBe(201);
    const central = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `Central ${suffix}`, address: 'Industrial Zone' },
    });
    const north = await request(baseUrl, '/admin/warehouses', {
      method: 'POST',
      token: adminToken,
      body: { name: `North ${suffix}`, address: 'North Gate' },
    });
    expect(central.status).toBe(201);
    expect(north.status).toBe(201);
    const single = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readId(manufacturer.body), `BC1${suffix}`, [{ warehouseId: readId(central.body), quantity: 10, isPrimary: false }]),
    });
    expect(single.status).toBe(201);
    const singleStocks = readStocks(single.body);
    expect(singleStocks).toEqual([expect.objectContaining({ warehouseId: readId(central.body), quantity: 10, isPrimary: true })]);
    const twoPrimary = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readId(manufacturer.body), `BC2${suffix}`, [
        { warehouseId: readId(central.body), quantity: 4, isPrimary: true },
        { warehouseId: readId(north.body), quantity: 6, isPrimary: true },
      ]),
    });
    expect(twoPrimary.status).toBe(400);
    const product = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readId(manufacturer.body), `BC3${suffix}`, [
        { warehouseId: readId(central.body), quantity: 4, isPrimary: false },
        { warehouseId: readId(north.body), quantity: 6, isPrimary: true },
      ]),
    });
    expect(product.status).toBe(201);
    const productId = readId(product.body);
    expect(readStocks(product.body).find((stock) => stock.warehouseId === readId(north.body))?.isPrimary).toBe(true);
    const quantity = await request(baseUrl, `/admin/products/${productId}/stocks/${readId(central.body)}`, {
      method: 'PATCH',
      token: adminToken,
      body: { quantity: 15 },
    });
    const afterQuantity = readStocks(quantity.body);
    expect(afterQuantity.find((stock) => stock.warehouseId === readId(central.body))?.quantity).toBe(15);
    expect(afterQuantity.find((stock) => stock.warehouseId === readId(north.body))?.quantity).toBe(6);
    const primary = await request(baseUrl, `/admin/products/${productId}/primary-warehouse`, {
      method: 'PATCH',
      token: adminToken,
      body: { warehouseId: readId(central.body) },
    });
    expect(primary.status).toBe(200);
    const afterPrimary = readStocks(primary.body);
    expect(afterPrimary.filter((stock) => stock.isPrimary)).toHaveLength(1);
    expect(afterPrimary.find((stock) => stock.isPrimary)?.warehouseId).toBe(readId(central.body));
    const duplicate = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readId(manufacturer.body), `BC3${suffix}`, [{ warehouseId: readId(central.body), quantity: 1 }]),
    });
    expect(duplicate.status).toBe(409);
    const disabled = await request(baseUrl, `/admin/manufacturers/${readId(manufacturer.body)}/status`, {
      method: 'PATCH',
      token: adminToken,
      body: { status: ManufacturerStatus.DISABLED },
    });
    expect(disabled.status).toBe(200);
    const blocked = await request(baseUrl, '/admin/products', {
      method: 'POST',
      token: adminToken,
      body: productBody(readId(manufacturer.body), `BC4${suffix}`, [{ warehouseId: readId(north.body), quantity: 2 }]),
    });
    expect(blocked.status).toBe(400);
    const stored = await request(baseUrl, `/admin/warehouses/${readId(north.body)}/products`, { token: adminToken });
    expect(stored.status).toBe(200);
    const storedRows = stored.body as Array<{ productId: number; quantity: number }>;
    expect(storedRows.some((row) => row.productId === productId && row.quantity === 6)).toBe(true);
  });
});

function productBody(manufacturerId: number, barcode: string, stocks: ReadonlyArray<{ warehouseId: number; quantity: number; isPrimary?: boolean }>): object {
  return {
    name: `Product ${barcode}`,
    barcode,
    manufacturerId,
    activeIngredient: 'Paracetamol',
    minimumOrderQuantity: 1,
    maximumOrderQuantity: 20,
    lowQuantityThreshold: 5,
    pharmacyPriceUsd: '2.50',
    pharmacyPriceSyp: '40000',
    consumerPriceUsd: '3.00',
    consumerPriceSyp: '50000',
    category: 'NATIONAL_MEDICINE',
    saleUnit: 'PACK',
    stocks,
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

function readToken(body: unknown): string {
  if (!isRecord(body) || typeof body.accessToken !== 'string') {
    throw new Error('The sign-in response did not include an access token');
  }
  return body.accessToken;
}

function readId(body: unknown): number {
  if (!isRecord(body) || typeof body.id !== 'number') {
    throw new Error('The response did not include an id');
  }
  return body.id;
}

function readStocks(body: unknown): Array<{ warehouseId: number; quantity: number; isPrimary: boolean }> {
  if (!isRecord(body) || !Array.isArray(body.stocks)) {
    throw new Error('The response did not include stocks');
  }
  return body.stocks.map((stock: unknown) => {
    if (!isRecord(stock) || typeof stock.warehouseId !== 'number' || typeof stock.quantity !== 'number' || typeof stock.isPrimary !== 'boolean') {
      throw new Error('A stock row was incomplete');
    }
    return { warehouseId: stock.warehouseId, quantity: stock.quantity, isPrimary: stock.isPrimary };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
