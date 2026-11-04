import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { PASSWORD_MAX_LENGTH } from '@/common/constants/password.constant';

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const HASH_PREFIX = 'scrypt';

/**
 * Stores a password as a scrypt hash. The plain value is never returned.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await deriveKey(password, salt);
  return [HASH_PREFIX, SCRYPT_N, SCRYPT_R, SCRYPT_P, salt.toString('base64url'), derived.toString('base64url')].join(':');
}

/**
 * Returns whether `password` matches a value produced by {@link hashPassword}.
 */
export async function comparePassword(password: string, passwordHash: string): Promise<boolean> {
  const parts = passwordHash.split(':');
  if (parts.length !== 6 || parts[0] !== HASH_PREFIX) {
    return false;
  }
  const salt = Buffer.from(parts[4], 'base64url');
  const expected = Buffer.from(parts[5], 'base64url');
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }
  const derived = await deriveKey(password, salt);
  if (derived.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(derived, expected);
}

function deriveKey(password: string, salt: Buffer): Promise<Buffer> {
  const bounded = password.slice(0, PASSWORD_MAX_LENGTH);
  return new Promise((resolve, reject) => {
    scrypt(bounded, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }, (error, derived) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(derived);
    });
  });
}
