import { registerAs } from '@nestjs/config';

export default [
  registerAs('admin', () => ({
    mobileNumber: process.env.ADMIN_MOBILE,
    password: process.env.ADMIN_PASSWORD,
  })),
];
