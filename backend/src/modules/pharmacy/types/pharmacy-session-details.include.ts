import { Prisma } from '@prisma/client';

/** Sessions are loaded without the pharmacy relation. */
export const pharmacySessionDetailsInclude = {} satisfies Prisma.PharmacySessionInclude;
