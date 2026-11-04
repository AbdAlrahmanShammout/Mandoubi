import { AppException } from './app.exception';
import { AppExceptionInput } from './app-exception.input';
import { ErrorKind } from './error-kind.enum';

/**
 * A precondition or state transition was not allowed.
 */
export class InvalidStateException extends AppException {
  constructor(data: Omit<AppExceptionInput, 'kind'>) {
    super({ ...data, kind: ErrorKind.INVALID_STATE, userFriendly: data.userFriendly ?? true });
  }
}
