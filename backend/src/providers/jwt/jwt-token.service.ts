import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable } from '@nestjs/common';
import { InternalException } from '@/common/exceptions/internal.exception';
import { JwtConfigService } from '@/config/jwt/jwt-config.service';
import { AccessTokenPayload, SignAccessTokenInput } from '@/providers/jwt/defs/access-token.defs';
import { JwtExpiredException } from '@/providers/jwt/exceptions/jwt-expired.exception';
import { JwtInvalidException } from '@/providers/jwt/exceptions/jwt-invalid.exception';

const LIFETIME_PATTERN = /^(\d+)(s|m|h|d)$/;
const SECONDS_BY_UNIT = { s: 1, m: 60, h: 3600, d: 86400 } as const;

/**
 * Signs and verifies access tokens. This is the only JWT implementation.
 */
@Injectable()
export class JwtTokenService {
  constructor(private readonly jwtConfig: JwtConfigService) {}
  /**
   * Signs an access token with the configured secret, issuer, and lifetime.
   */
  signAccessToken(input: SignAccessTokenInput): string {
    const issuedAt = Math.floor(Date.now() / 1000);
    const payload: AccessTokenPayload = {
      sub: input.userId,
      role: input.role,
      iss: this.jwtConfig.issuer,
      iat: issuedAt,
      exp: issuedAt + this.parseLifetime(this.jwtConfig.accessExpiresIn),
      ...(input.sessionId !== undefined ? { sessionId: input.sessionId } : {}),
    };
    const header = encodeSegment({ alg: 'HS256', typ: 'JWT' });
    const body = encodeSegment(payload);
    const signature = this.sign(`${header}.${body}`);
    return `${header}.${body}.${signature}`;
  }
  /**
   * Returns the payload when the signature, issuer, and expiry are valid.
   */
  verifyAccessToken(token: string): AccessTokenPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new JwtInvalidException();
    }
    const [headerSegment, bodySegment, signature] = parts;
    const expected = this.sign(`${headerSegment}.${bodySegment}`);
    if (!signaturesMatch(signature, expected)) {
      throw new JwtInvalidException();
    }
    const header = decodeSegment(headerSegment);
    if (!isRecord(header) || header.alg !== 'HS256') {
      throw new JwtInvalidException();
    }
    const payload = decodeSegment(bodySegment);
    if (!isAccessTokenPayload(payload) || payload.iss !== this.jwtConfig.issuer) {
      throw new JwtInvalidException();
    }
    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      throw new JwtExpiredException();
    }
    return payload;
  }
  private parseLifetime(lifetime: string): number {
    const match = LIFETIME_PATTERN.exec(lifetime);
    if (!match) {
      throw new InternalException('The access-token lifetime is invalid');
    }
    const amount = Number(match[1]);
    const unit = match[2] as keyof typeof SECONDS_BY_UNIT;
    return amount * SECONDS_BY_UNIT[unit];
  }
  private sign(value: string): string {
    return createHmac('sha256', this.jwtConfig.accessSecret).update(value).digest('base64url');
  }
}

function encodeSegment(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decodeSegment(segment: string): unknown {
  try {
    return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as unknown;
  } catch {
    throw new JwtInvalidException();
  }
}

function signaturesMatch(actual: string, expected: string): boolean {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isAccessTokenPayload(value: unknown): value is AccessTokenPayload {
  if (!isRecord(value)) {
    return false;
  }
  const sessionIsValid = value.sessionId === undefined || typeof value.sessionId === 'number';
  return typeof value.sub === 'number' && typeof value.role === 'string' && typeof value.iss === 'string' && typeof value.exp === 'number' && typeof value.iat === 'number' && sessionIsValid;
}
