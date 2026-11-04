import { Prisma } from '@prisma/client';

/** Manufacturers are loaded without their products. */
export const manufacturerDetailsInclude = {} satisfies Prisma.ManufacturerInclude;
