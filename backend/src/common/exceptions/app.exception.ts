import { AppExceptionInput } from './app-exception.input';
import { ErrorKind } from './error-kind.enum';

/**
 * Base application error. Callers classify with `kind`; filters choose the HTTP status.
 */
export class AppException extends Error {
  readonly code: string;
  readonly kind: ErrorKind;
  readonly userFriendly: boolean;
  constructor(data: AppExceptionInput) {
    const { message, code = 'UNKNOWN_CODE', kind = ErrorKind.INTERNAL, userFriendly = false } = data;
    super(message);
    this.name = new.target.name;
    this.code = code;
    this.kind = kind;
    this.userFriendly = userFriendly;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
