import Joi from 'joi';
import { appConfigSchema } from '@/config/app/app-config.schema';
import { databaseConfigSchema } from '@/config/database/database-config.schema';
import { jwtConfigSchema } from '@/config/jwt/jwt-config.schema';
import { swaggerConfigSchema } from '@/config/swagger/swagger-config.schema';

const environmentSchema = Joi.object({
  ...appConfigSchema,
  ...databaseConfigSchema,
  ...jwtConfigSchema,
  ...swaggerConfigSchema,
});
const DECLARED_KEYS = new Set<string>([
  ...Object.keys(appConfigSchema),
  ...Object.keys(databaseConfigSchema),
  ...Object.keys(jwtConfigSchema),
  ...Object.keys(swaggerConfigSchema),
]);
const APPLICATION_KEY_PATTERN = /^(APP_|DATABASE_|JWT_|SWAGGER_)/;

/**
 * Validates declared application variables and rejects typos in those prefixes.
 * Shell and package-manager variables stay outside the schema.
 */
export function validateEnvironment(source: Record<string, unknown>): Record<string, unknown> {
  const relevant: Record<string, unknown> = {};
  const unknownKeys: string[] = [];
  for (const key of Object.keys(source)) {
    if (DECLARED_KEYS.has(key)) {
      relevant[key] = source[key];
      continue;
    }
    if (APPLICATION_KEY_PATTERN.test(key)) {
      unknownKeys.push(key);
    }
  }
  if (unknownKeys.length > 0) {
    throw new Error(`Unknown configuration keys: ${unknownKeys.join(', ')}`);
  }
  const { error, value } = environmentSchema.validate(relevant, {
    abortEarly: false,
    allowUnknown: false,
  });
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
  return value as Record<string, unknown>;
}
