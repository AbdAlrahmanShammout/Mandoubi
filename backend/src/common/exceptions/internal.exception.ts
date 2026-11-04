import { AppException } from './app.exception';
import { ErrorKind } from './error-kind.enum';

/**
 * An unexpected defect. The client message stays generic outside development.
 */
export class InternalException extends AppException {
  constructor(message = 'An unexpected error occurred') {
    super({
      message,
      code: 'INTERNAL',
      kind: ErrorKind.INTERNAL,
      userFriendly: false,
    });
  }
}
