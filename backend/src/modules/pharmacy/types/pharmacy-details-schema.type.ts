import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { pharmacyDetailsInclude } from '@/modules/pharmacy/types/pharmacy-details.include';

/** Persistence payload that can construct a pharmacy entity. */
export type PharmacyType = OptionalRelations<Prisma.PharmacyGetPayload<{ include: typeof pharmacyDetailsInclude }>>;
