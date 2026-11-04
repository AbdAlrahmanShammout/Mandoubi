import { HttpException, HttpStatus } from '@nestjs/common';
import { AppException } from '@/common/exceptions/app.exception';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';
import { ValidationExceptions } from '@/common/exceptions/validation.exception';
import { GeneralTypeException } from '@/common/filter/exception_return_handler/type/general-type.exception';
import { statusForKind } from '@/common/filter/exception_mappers/kind-status';
import { mapPrismaException } from '@/common/filter/exception_mappers/prisma-exception-handler';

const HTTP_STATUS_KIND: Readonly<Record<number, ErrorKind>> = {
  [HttpStatus.BAD_REQUEST]: ErrorKind.VALIDATION,
  [HttpStatus.UNAUTHORIZED]: ErrorKind.UNAUTHENTICATED,
  [HttpStatus.FORBIDDEN]: ErrorKind.ACCESS_DENIED,
  [HttpStatus.NOT_FOUND]: ErrorKind.NOT_FOUND,
  [HttpStatus.CONFLICT]: ErrorKind.CONFLICT,
  [HttpStatus.UNPROCESSABLE_ENTITY]: ErrorKind.VALIDATION,
  [HttpStatus.TOO_MANY_REQUESTS]: ErrorKind.INVALID_STATE,
  [HttpStatus.SERVICE_UNAVAILABLE]: ErrorKind.DEPENDENCY_FAILURE,
};

/**
 * Turns any thrown value into the canonical error used by the HTTP filter.
 */
export function normalizeException(exception: unknown): GeneralTypeException {
  const mapped = mapPrismaException(exception);
  if (mapped) {
    return mapped;
  }
  if (exception instanceof AppException) {
    return fromAppException(exception);
  }
  if (exception instanceof HttpException) {
    return fromHttpException(exception);
  }
  return new GeneralTypeException({
    message: 'An unexpected error occurred',
    code: 'INTERNAL',
    kind: ErrorKind.INTERNAL,
    userFriendly: false,
    statusCode: statusForKind(ErrorKind.INTERNAL),
  });
}

function fromAppException(exception: AppException): GeneralTypeException {
  const validationErrorObjects = exception instanceof ValidationExceptions ? exception.validationErrorObjects : [];
  return new GeneralTypeException({
    message: exception.message,
    code: exception.code,
    kind: exception.kind,
    userFriendly: exception.userFriendly,
    statusCode: statusForKind(exception.kind),
    validationErrorObjects,
  });
}

function fromHttpException(exception: HttpException): GeneralTypeException {
  const statusCode = exception.getStatus();
  const kind = HTTP_STATUS_KIND[statusCode] ?? (statusCode >= 500 ? ErrorKind.INTERNAL : ErrorKind.INVALID_STATE);
  const code = statusCode === HttpStatus.TOO_MANY_REQUESTS ? 'TOO_MANY_REQUESTS' : kind;
  return new GeneralTypeException({
    message: readHttpMessage(exception),
    code,
    kind,
    userFriendly: statusCode < 500,
    statusCode,
  });
}

function readHttpMessage(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') {
    return body;
  }
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const message = body.message;
    if (typeof message === 'string') {
      return message;
    }
    if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
      return message.join(', ');
    }
  }
  return exception.message;
}
