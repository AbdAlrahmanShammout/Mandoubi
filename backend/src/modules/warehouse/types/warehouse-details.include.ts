import { Prisma } from '@prisma/client';

/** Warehouses are loaded without stock rows. */
export const warehouseDetailsInclude = {} satisfies Prisma.WarehouseInclude;
