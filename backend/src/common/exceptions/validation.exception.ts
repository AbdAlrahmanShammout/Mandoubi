import { AppException } from '@/common/exceptions/app.exception';
import { AppExceptionInput } from '@/common/exceptions/app-exception.input';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';
import { ValidationErrorObject } from '@/common/exceptions/validation-error-object';

/**
 * Structural validation failed before a service ran.
 */
export class ValidationExceptions extends AppException {
  readonly validationErrorObjects: readonly ValidationErrorObject[];
  constructor(data: AppExceptionInput & { readonly validationErrorObjects: readonly ValidationErrorObject[] }) {
    super({
      message: data.message,
      code: data.code ?? 'BAD_USER_INPUT',
      kind: ErrorKind.VALIDATION,
      userFriendly: data.userFriendly ?? true,
    });
    this.validationErrorObjects = data.validationErrorObjects;
  }
}
