/**
 * Claims a verified access token contributes to the request.
 */
export interface AccessTokenClaims {
  readonly userId: number;
  readonly role: string;
  readonly sessionId?: number;
}
