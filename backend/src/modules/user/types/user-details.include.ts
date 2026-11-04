import { Prisma } from '@prisma/client';

/** Users are loaded without relations. */
export const userDetailsInclude = {} satisfies Prisma.UserInclude;
