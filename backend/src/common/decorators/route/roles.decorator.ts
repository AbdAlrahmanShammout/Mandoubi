import { SetMetadata } from '@nestjs/common';

/** Metadata key read by the role guard. */
export const ROLES_KEY = 'roles';

/**
 * Declares the roles allowed to call a route. The role guard performs the check.
 */
export const Roles = <TRole extends string>(...roles: readonly TRole[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
