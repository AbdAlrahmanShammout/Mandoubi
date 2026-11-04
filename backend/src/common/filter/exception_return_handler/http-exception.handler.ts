import { Response } from 'express';
import { ValidationErrorObject } from '@/common/exceptions/validation-error-object';
import { GeneralTypeException } from '@/common/filter/exception_return_handler/type/general-type.exception';

/**
 * Body written for every failed HTTP request. `kind` stays internal.
 */
interface ErrorResponseBody {
  readonly message: string;
  readonly code: string;
  readonly statusCode: number;
  readonly validationErrorObjects?: readonly ValidationErrorObject[];
  readonly stack?: string;
}

/**
 * Options that decide how much of an error a caller may see.
 */
interface WriteHttpExceptionOptions {
  readonly exposeMessage: boolean;
  readonly exposeStack: boolean;
}

/**
 * Writes the normalized error as an HTTP response.
 */
export function writeHttpException(
  response: Response,
  exception: GeneralTypeException,
  options: WriteHttpExceptionOptions,
): void {
  const body: ErrorResponseBody = {
    message: options.exposeMessage ? exception.message : 'An unexpected error occurred',
    code: exception.code,
    statusCode: exception.statusCode,
  };
  const withValidation = exception.validationErrorObjects.length > 0
    ? { ...body, validationErrorObjects: exception.validationErrorObjects }
    : body;
  const payload = options.exposeStack && exception.stack ? { ...withValidation, stack: exception.stack } : withValidation;
  response.status(exception.statusCode).json(payload);
}
