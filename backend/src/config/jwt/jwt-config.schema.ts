import Joi from 'joi';

/**
 * Validation rules for access-token signing.
 */
export const jwtConfigSchema = {
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_ISSUER: Joi.string().default('pharmacy-distribution'),
} as const;
