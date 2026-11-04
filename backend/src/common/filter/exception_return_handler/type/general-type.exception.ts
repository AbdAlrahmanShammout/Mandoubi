import { ErrorKind } from '@/common/exceptions/error-kind.enum';
import { ValidationErrorObject } from '@/common/exceptions/validation-error-object';

/**
 * Canonical error after every source has been translated.
 */
export class GeneralTypeException extends Error {
  readonly code: string;
  readonly kind: ErrorKind;
  readonly userFriendly: boolean;
  readonly statusCode: number;
  readonly validationErrorObjects: readonly ValidationErrorObject[];
  constructor(data: {
    readonly message: string;
    readonly code: string;
    readonly kind: ErrorKind;
    readonly userFriendly: boolean;
    readonly statusCode: number;
    readonly validationErrorObjects?: readonly ValidationErrorObject[];
  }) {
    super(data.message);
    this.name = GeneralTypeException.name;
    this.code = data.code;
    this.kind = data.kind;
    this.userFriendly = data.userFriendly;
    this.statusCode = data.statusCode;
    this.validationErrorObjects = data.validationErrorObjects ?? [];
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
