import { SetMetadata } from '@nestjs/common';

/** Metadata key read by guards that honor a public route. */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route that accepts callers without an access token.
 */
export const PublicRoute = (): ReturnType<typeof SetMetadata> => SetMetadata(IS_PUBLIC_KEY, true);
