import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { userDetailsInclude } from '@/modules/user/types/user-details.include';

/** Persistence payload that can construct a user entity. */
export type UserType = OptionalRelations<Prisma.UserGetPayload<{ include: typeof userDetailsInclude }>>;
