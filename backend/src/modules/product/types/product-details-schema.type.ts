import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { productDetailsInclude, warehouseStockInclude } from '@/modules/product/types/product-details.include';

/** Persistence payload that can construct a product entity. */
export type ProductType = OptionalRelations<Prisma.ProductGetPayload<{ include: typeof productDetailsInclude }>>;

/** Persistence payload for a stock row shown from a warehouse. */
export type WarehouseStockType = OptionalRelations<Prisma.ProductStockGetPayload<{ include: typeof warehouseStockInclude }>>;

/** Stock row nested under a product. */
export type ProductStockType = ProductType['stocks'] extends ReadonlyArray<infer TStock> | undefined ? TStock : never;
