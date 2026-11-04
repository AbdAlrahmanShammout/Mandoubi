import Joi from 'joi';
import { Environment } from '@/config/environment';

/**
 * Validation rules for application process settings.
 */
export const appConfigSchema = {
  NODE_ENV: Joi.string()
    .valid(...Object.values(Environment))
    .default(Environment.DEVELOPMENT),
  APP_PORT: Joi.number().port().default(3000),
  APP_ALLOWED_ORIGINS: Joi.string().default('http://localhost:3000'),
  APP_BODY_SIZE_LIMIT: Joi.string().default('1mb'),
} as const;
