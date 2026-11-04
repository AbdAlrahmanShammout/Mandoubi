import Joi from 'joi';
import { MOBILE_NUMBER_PATTERN } from '@/common/constants/mobile-number.constant';
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '@/common/constants/password.constant';

/**
 * Validation rules for the bootstrap administrator.
 */
export const adminConfigSchema = {
  ADMIN_MOBILE: Joi.string().pattern(MOBILE_NUMBER_PATTERN).required(),
  ADMIN_PASSWORD: Joi.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH).required(),
} as const;
