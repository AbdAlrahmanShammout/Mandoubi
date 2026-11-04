import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { warehouseDetailsInclude } from '@/modules/warehouse/types/warehouse-details.include';

/** Persistence payload that can construct a warehouse entity. */
export type WarehouseType = OptionalRelations<Prisma.WarehouseGetPayload<{ include: typeof warehouseDetailsInclude }>>;
