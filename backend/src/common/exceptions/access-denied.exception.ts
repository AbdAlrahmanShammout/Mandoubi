import { AppException } from './app.exception';
import { ErrorKind } from './error-kind.enum';

/**
 * The caller is authenticated and is not allowed to perform the action.
 */
export class AccessDeniedException extends AppException {
  constructor(message = 'You are not allowed to perform this action') {
    super({
      message,
      code: 'ACCESS_DENIED',
      kind: ErrorKind.ACCESS_DENIED,
      userFriendly: true,
    });
  }
}
