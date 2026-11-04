import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { driverDetailsInclude } from '@/modules/driver/types/driver-details.include';

/** Persistence payload that can construct a driver entity. */
export type DriverType = OptionalRelations<Prisma.DriverGetPayload<{ include: typeof driverDetailsInclude }>>;
