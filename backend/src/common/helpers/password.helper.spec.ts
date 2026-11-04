import { describe, expect, it } from '@jest/globals';
import { comparePassword, hashPassword } from '@/common/helpers/password.helper';

describe('password helper', () => {
  it('matches the password that was hashed', async () => {
    const passwordHash = await hashPassword('correct-password');
    await expect(comparePassword('correct-password', passwordHash)).resolves.toBe(true);
  });
  it('rejects a different password and a malformed hash', async () => {
    const passwordHash = await hashPassword('correct-password');
    await expect(comparePassword('other-password', passwordHash)).resolves.toBe(false);
    await expect(comparePassword('correct-password', 'not-a-hash')).resolves.toBe(false);
  });
});
