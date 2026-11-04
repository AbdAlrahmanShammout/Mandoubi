import { ValidationError, ValidationPipe } from '@nestjs/common';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';
import { ValidationErrorObject } from '@/common/exceptions/validation-error-object';
import { ValidationExceptions } from '@/common/exceptions/validation.exception';

/**
 * Global request pipe. Unexpected properties are rejected.
 */
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors: ValidationError[]): ValidationExceptions => {
        return new ValidationExceptions({
          message: 'Invalid input',
          code: 'BAD_USER_INPUT',
          kind: ErrorKind.VALIDATION,
          validationErrorObjects: flattenValidationErrors(errors),
        });
      },
    });
  }
}

function flattenValidationErrors(errors: readonly ValidationError[], parent = ''): ValidationErrorObject[] {
  return errors.flatMap((error) => {
    const field = parent.length > 0 ? `${parent}.${error.property}` : error.property;
    const ownMessages = error.constraints ? Object.values(error.constraints) : [];
    const current = ownMessages.length > 0 ? [{ field, messages: ownMessages }] : [];
    const children = error.children ? flattenValidationErrors(error.children, field) : [];
    return [...current, ...children];
  });
}
