/**
 * The authenticated caller, as shared code is allowed to see it.
 */
export interface Principal {
  readonly id: number;
  readonly role: string;
}
