import { AppException } from './app.exception';
import { AppExceptionInput } from './app-exception.input';
import { ErrorKind } from './error-kind.enum';

/**
 * A uniqueness or concurrent-modification rule failed.
 */
export class ConflictException extends AppException {
  constructor(data: Omit<AppExceptionInput, 'kind'>) {
    super({ ...data, kind: ErrorKind.CONFLICT, userFriendly: data.userFriendly ?? true });
  }
}
