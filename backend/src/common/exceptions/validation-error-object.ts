/**
 * One field failure produced by request validation.
 */
export interface ValidationErrorObject {
  readonly field: string;
  readonly messages: readonly string[];
}
