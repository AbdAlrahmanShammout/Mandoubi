import Joi from 'joi';

/**
 * Validation rules for the database connection.
 */
export const databaseConfigSchema = {
  DATABASE_URL: Joi.string().uri({ scheme: ['postgresql', 'postgres'] }).required(),
} as const;
