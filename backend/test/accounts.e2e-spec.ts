import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AddressInfo } from 'net';
import { configureApp } from '@/main';
import { AppModule } from '@/app.module';
import { AccountStatus } from '@/modules/user/enum/account-status.enum';

describe('Accounts', () => {
  let app: NestExpressApplication;
  let baseUrl = '';
  let adminToken = '';
  let driverId = 0;
  const suffix = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  const pharmacyMobile = `0991${suffix}`;
  const driverMobile = `0992${suffix}`;
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
  it('signs in the bootstrap administrator and hides the password hash', async () => {
    const response = await fetch(`${baseUrl}/admin/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        mobileNumber: process.env.ADMIN_MOBILE,
        password: process.env.ADMIN_PASSWORD,
      }),
    });
    expect(response.status).toBe(200);
    const body = await response.json() as { accessToken: string };
    adminToken = body.accessToken;
    expect(adminToken.length).toBeGreaterThan(20);
    const me = await fetch(`${baseUrl}/admin/auth/me`, { headers: { authorization: `Bearer ${adminToken}` } });
    const profile = await me.json() as { role: string; passwordHash?: string };
    expect(me.status).toBe(200);
    expect(profile.role).toBe('ADMIN');
    expect(profile.passwordHash).toBeUndefined();
  });
  it('creates a pharmacy and a driver, then lets the driver sign in', async () => {
    const pharmacy = await fetch(`${baseUrl}/admin/pharmacies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Al Shifa Pharmacy',
        mobileNumber: pharmacyMobile,
        address: 'Baghdad Street',
        password: 'pharmacy-password',
      }),
    });
    expect(pharmacy.status).toBe(201);
    const driver = await fetch(`${baseUrl}/admin/drivers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Ahmad Ali', mobileNumber: driverMobile, password: 'driver-password' }),
    });
    expect(driver.status).toBe(201);
    const driverBody = await driver.json() as { id: number };
    driverId = driverBody.id;
    const signIn = await fetch(`${baseUrl}/driver/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mobileNumber: driverMobile, password: 'driver-password' }),
    });
    expect(signIn.status).toBe(200);
    const duplicate = await fetch(`${baseUrl}/admin/pharmacies`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Second Pharmacy',
        mobileNumber: pharmacyMobile,
        address: 'Other Street',
        password: 'pharmacy-password',
      }),
    });
    expect(duplicate.status).toBe(409);
  });
  it('rejects a wrong password, a missing token, and a driver calling an admin route', async () => {
    const wrongPassword = await fetch(`${baseUrl}/admin/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mobileNumber: process.env.ADMIN_MOBILE, password: 'not-the-password' }),
    });
    expect(wrongPassword.status).toBe(401);
    const missing = await fetch(`${baseUrl}/admin/auth/me`);
    expect(missing.status).toBe(401);
    const driverSignIn = await fetch(`${baseUrl}/driver/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mobileNumber: driverMobile, password: 'driver-password' }),
    });
    const driverToken = await driverSignIn.json() as { accessToken: string };
    const forbidden = await fetch(`${baseUrl}/admin/pharmacies/1`, {
      headers: { authorization: `Bearer ${driverToken.accessToken}` },
    });
    expect(forbidden.status).toBe(403);
    const disabled = await fetch(`${baseUrl}/admin/drivers/${driverId}/status`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ status: AccountStatus.DISABLED }),
    });
    expect(disabled.status).toBe(200);
    const blocked = await fetch(`${baseUrl}/driver/auth/sign-in`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ mobileNumber: driverMobile, password: 'driver-password' }),
    });
    expect(blocked.status).toBe(401);
  });
});
