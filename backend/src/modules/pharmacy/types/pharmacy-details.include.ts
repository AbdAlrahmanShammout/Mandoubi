import { Prisma } from '@prisma/client';

/** Pharmacies are loaded without relations. */
export const pharmacyDetailsInclude = {} satisfies Prisma.PharmacyInclude;
