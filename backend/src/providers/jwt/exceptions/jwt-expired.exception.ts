import { AppException } from '@/common/exceptions/app.exception';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';

/**
 * The access token signature was valid and its expiry has passed.
 */
export class JwtExpiredException extends AppException {
  constructor() {
    super({
      message: 'The access token has expired',
      code: 'ACCESS_TOKEN_EXPIRED',
      kind: ErrorKind.UNAUTHENTICATED,
      userFriendly: true,
    });
  }
}
