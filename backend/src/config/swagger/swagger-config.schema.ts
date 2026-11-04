import Joi from 'joi';

/**
 * Validation rules for API documentation exposure.
 */
export const swaggerConfigSchema = {
  SWAGGER_ENABLED: Joi.boolean().default(false),
} as const;
