import { describe, expect, it } from '@jest/globals';
import { JwtConfigService } from '@/config/jwt/jwt-config.service';
import { JwtExpiredException } from '@/providers/jwt/exceptions/jwt-expired.exception';
import { JwtInvalidException } from '@/providers/jwt/exceptions/jwt-invalid.exception';
import { JwtTokenService } from '@/providers/jwt/jwt-token.service';

function createService(expiresIn: string): JwtTokenService {
  const config = {
    accessSecret: 'test-secret-value-0123456789',
    accessExpiresIn: expiresIn,
    issuer: 'pharmacy-distribution',
  } as JwtConfigService;
  return new JwtTokenService(config);
}

describe('JwtTokenService', () => {
  it('returns the signed claims', () => {
    const service = createService('15m');
    const token = service.signAccessToken({ userId: 7, role: 'ADMIN', sessionId: 4 });
    expect(service.verifyAccessToken(token)).toEqual(expect.objectContaining({ sub: 7, role: 'ADMIN', sessionId: 4 }));
  });
  it('rejects a changed signature and an expired token', () => {
    const service = createService('15m');
    const token = service.signAccessToken({ userId: 7, role: 'ADMIN' });
    const [header, body, signature] = token.split('.');
    expect(() => service.verifyAccessToken(`${header}.${body}.${signature}x`)).toThrow(JwtInvalidException);
    const expired = createService('0s');
    expect(() => expired.verifyAccessToken(expired.signAccessToken({ userId: 7, role: 'ADMIN' }))).toThrow(JwtExpiredException);
  });
});
