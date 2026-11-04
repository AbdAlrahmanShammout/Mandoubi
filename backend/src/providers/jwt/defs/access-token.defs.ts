/**
 * Values required to sign one access token.
 */
export interface SignAccessTokenInput {
  readonly userId: number;
  readonly role: string;
  readonly sessionId?: number;
}

/**
 * Payload accepted after the signature, issuer, and expiry checks.
 */
export interface AccessTokenPayload {
  readonly sub: number;
  readonly role: string;
  readonly sessionId?: number;
  readonly iss: string;
  readonly exp: number;
  readonly iat: number;
}
