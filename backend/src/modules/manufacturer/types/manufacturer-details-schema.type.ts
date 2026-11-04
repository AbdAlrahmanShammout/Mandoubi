import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { manufacturerDetailsInclude } from '@/modules/manufacturer/types/manufacturer-details.include';

/** Persistence payload that can construct a manufacturer entity. */
export type ManufacturerType = OptionalRelations<Prisma.ManufacturerGetPayload<{ include: typeof manufacturerDetailsInclude }>>;
