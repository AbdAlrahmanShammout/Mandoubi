import { AppException } from './app.exception';
import { ErrorKind } from './error-kind.enum';

/**
 * A required external system failed.
 */
export class DependencyFailureException extends AppException {
  constructor(message = 'A required dependency is unavailable') {
    super({
      message,
      code: 'DEPENDENCY_FAILURE',
      kind: ErrorKind.DEPENDENCY_FAILURE,
      userFriendly: true,
    });
  }
}
