import { Prisma } from '@prisma/client';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';
import { GeneralTypeException } from '@/common/filter/exception_return_handler/type/general-type.exception';
import { statusForKind } from '@/common/filter/exception_mappers/kind-status';

/**
 * Translates known Prisma failures into the shared error type.
 */
export function mapPrismaException(exception: unknown): GeneralTypeException | null {
  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    return mapKnownRequest(exception.code);
  }
  if (exception instanceof Prisma.PrismaClientUnknownRequestError) {
    return build(ErrorKind.INTERNAL, 'DATABASE_ERROR', 'The database request failed', false);
  }
  if (exception instanceof Prisma.PrismaClientValidationError) {
    return build(ErrorKind.VALIDATION, 'DATABASE_VALIDATION', 'The database request was rejected', true);
  }
  if (exception instanceof Prisma.PrismaClientInitializationError) {
    return build(ErrorKind.DEPENDENCY_FAILURE, 'DATABASE_UNAVAILABLE', 'The database is unavailable', false);
  }
  return null;
}

function mapKnownRequest(code: string): GeneralTypeException {
  if (code === 'P2002') {
    return build(ErrorKind.CONFLICT, 'CONFLICT', 'The record conflicts with an existing one', true);
  }
  if (code === 'P2025') {
    return build(ErrorKind.NOT_FOUND, 'RESOURCE_NOT_FOUND', 'The requested record was not found', true);
  }
  if (code === 'P2003') {
    return build(ErrorKind.INVALID_STATE, 'INVALID_RELATION', 'The request refers to a missing related record', true);
  }
  return build(ErrorKind.INTERNAL, 'DATABASE_ERROR', 'The database request failed', false);
}

function build(kind: ErrorKind, code: string, message: string, userFriendly: boolean): GeneralTypeException {
  return new GeneralTypeException({
    message,
    code,
    kind,
    userFriendly,
    statusCode: statusForKind(kind),
  });
}
