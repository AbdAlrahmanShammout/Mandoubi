import { HttpStatus } from '@nestjs/common';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';

const KIND_STATUS: Readonly<Record<ErrorKind, number>> = {
  [ErrorKind.VALIDATION]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ErrorKind.NOT_FOUND]: HttpStatus.NOT_FOUND,
  [ErrorKind.CONFLICT]: HttpStatus.CONFLICT,
  [ErrorKind.INVALID_STATE]: HttpStatus.BAD_REQUEST,
  [ErrorKind.UNAUTHENTICATED]: HttpStatus.UNAUTHORIZED,
  [ErrorKind.ACCESS_DENIED]: HttpStatus.FORBIDDEN,
  [ErrorKind.DEPENDENCY_FAILURE]: HttpStatus.SERVICE_UNAVAILABLE,
  [ErrorKind.INTERNAL]: HttpStatus.INTERNAL_SERVER_ERROR,
};

/**
 * Maps an application error kind to one HTTP status.
 */
export function statusForKind(kind: ErrorKind): number {
  return KIND_STATUS[kind];
}
