import { registerAs } from '@nestjs/config';

export default [
  registerAs('app', () => ({
    environment: process.env.NODE_ENV,
    port: process.env.APP_PORT,
    allowedOrigins: process.env.APP_ALLOWED_ORIGINS,
    bodySizeLimit: process.env.APP_BODY_SIZE_LIMIT,
  })),
];
