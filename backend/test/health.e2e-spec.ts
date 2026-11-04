import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';

describe('Health', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
    await configureApp(app);
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => {
    await app.close();
  });
  it('reports liveness without checking dependencies', async () => {
    const response = await fetch(`${baseUrl}/health/live`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
  it('reports readiness when the database answers', async () => {
    const response = await fetch(`${baseUrl}/health/ready`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ status: 'ok' });
  });
  it('serves a separate document for each audience', async () => {
    const admin = await fetch(`${baseUrl}/docs/admin`);
    const pharmacy = await fetch(`${baseUrl}/docs/pharmacy`);
    const driver = await fetch(`${baseUrl}/docs/driver`);
    expect(admin.status).toBe(200);
    expect(pharmacy.status).toBe(200);
    expect(driver.status).toBe(200);
  });
});
