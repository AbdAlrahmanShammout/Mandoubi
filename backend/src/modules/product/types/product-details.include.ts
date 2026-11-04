import { Prisma } from '@prisma/client';

/** Product loaded with its manufacturer and the warehouse on each stock row. */
export const productDetailsInclude = {
  manufacturer: true,
  stocks: { include: { warehouse: true } },
} satisfies Prisma.ProductInclude;

/** Stock row loaded with the warehouse and the full product. */
export const warehouseStockInclude = {
  warehouse: true,
  product: { include: productDetailsInclude },
} satisfies Prisma.ProductStockInclude;
