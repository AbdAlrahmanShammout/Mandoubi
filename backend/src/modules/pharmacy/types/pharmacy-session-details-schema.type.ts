import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { pharmacySessionDetailsInclude } from '@/modules/pharmacy/types/pharmacy-session-details.include';

/** Persistence payload that can construct a pharmacy session entity. */
export type PharmacySessionType = OptionalRelations<
  Prisma.PharmacySessionGetPayload<{ include: typeof pharmacySessionDetailsInclude }>
>;
