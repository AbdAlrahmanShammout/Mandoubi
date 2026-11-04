import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';

describe('Pharmacy session', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  const pharmacyMobile = `0993${suffix}`;
  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
    await configureApp(app);
    await app.listen(0);
    const address = app.getHttpServer().address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
    const admin = await fetch(`${baseUrl}/admin/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mobileNumber: process.env.ADMIN_MOBILE,
        password: process.env.ADMIN_PASSWORD,
      }),
    });
    const adminBody = await admin.json() as { accessToken: string };
    adminToken = adminBody.accessToken;
    const pharmacy = await fetch(`${baseUrl}/admin/pharmacies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Session Pharmacy',
        mobileNumber: pharmacyMobile,
        address: 'Hamra Street',
        password: 'pharmacy-password',
      }),
    });
    expect(pharmacy.status).toBe(201);
  });
  afterAll(async () => {
    await app.close();
  });
  it('revokes the previous server session when the pharmacy signs in again', async () => {
    const first = await signIn(baseUrl, pharmacyMobile);
    const firstProfile = await fetch(`${baseUrl}/pharmacy/auth/me`, {
      headers: { authorization: `Bearer ${first}` },
    });
    expect(firstProfile.status).toBe(200);
    const profile = await firstProfile.json() as { name: string; password?: string };
    expect(profile.name).toBe('Session Pharmacy');
    expect(profile.password).toBeUndefined();
    const second = await signIn(baseUrl, pharmacyMobile);
    const revoked = await fetch(`${baseUrl}/pharmacy/auth/me`, {
      headers: { authorization: `Bearer ${first}` },
    });
    const current = await fetch(`${baseUrl}/pharmacy/auth/me`, {
      headers: { authorization: `Bearer ${second}` },
    });
    expect(revoked.status).toBe(401);
    expect(current.status).toBe(200);
    const adminRoute = await fetch(`${baseUrl}/admin/pharmacies/1`, {
      headers: { authorization: `Bearer ${second}` },
    });
    expect(adminRoute.status).toBe(403);
  });
});

async function signIn(baseUrl: string, mobileNumber: string): Promise<string> {
  const response = await fetch(`${baseUrl}/pharmacy/auth/sign-in`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ mobileNumber, password: 'pharmacy-password' }),
  });
  expect(response.status).toBe(200);
  const body = await response.json() as { accessToken: string };
  return body.accessToken;
}
