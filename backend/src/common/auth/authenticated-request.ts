import { Request } from 'express';
import { AccessTokenClaims } from '@/common/auth/access-token-claims';
import { Principal } from '@/common/auth/principal.interface';

/**
 * HTTP request after the access-token guard has accepted the caller.
 */
export interface AuthenticatedRequest extends Request {
  user?: Principal;
  accessToken?: AccessTokenClaims;
}
