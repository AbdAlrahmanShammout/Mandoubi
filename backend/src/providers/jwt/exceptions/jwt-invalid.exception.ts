import { AppException } from '@/common/exceptions/app.exception';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';

/**
 * The access token signature or shape was not accepted.
 */
export class JwtInvalidException extends AppException {
  constructor() {
    super({
      message: 'The access token is invalid',
      code: 'ACCESS_TOKEN_INVALID',
      kind: ErrorKind.UNAUTHENTICATED,
      userFriendly: true,
    });
  }
}
