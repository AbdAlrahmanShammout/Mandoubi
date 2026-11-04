import { AppException } from './app.exception';
import { ErrorKind } from './error-kind.enum';

/**
 * The request has no usable credentials.
 */
export class UnauthenticatedException extends AppException {
  constructor(message = 'Authentication is required') {
    super({
      message,
      code: 'UNAUTHENTICATED',
      kind: ErrorKind.UNAUTHENTICATED,
      userFriendly: true,
    });
  }
}
