import { ErrorKind } from './error-kind.enum';

/**
 * Fields every application exception carries. HTTP status is not one of them.
 */
export interface AppExceptionInput {
  readonly message: string;
  readonly code?: string;
  readonly kind?: ErrorKind;
  readonly userFriendly?: boolean;
}
