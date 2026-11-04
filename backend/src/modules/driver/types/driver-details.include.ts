import { Prisma } from '@prisma/client';

/** Drivers are loaded without relations. */
export const driverDetailsInclude = {} satisfies Prisma.DriverInclude;
