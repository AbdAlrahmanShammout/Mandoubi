import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { deliveryAssignmentInclude } from '@/modules/delivery/types/delivery-assignment.include';

/** Persistence payload that can construct an assignment and its invoice. */
export type DeliveryAssignmentType = OptionalRelations<Prisma.DeliveryAssignmentGetPayload<{ include: typeof deliveryAssignmentInclude }>>;

/** Persistence payload that can construct one delivery event. */
export type DeliveryEventType = Prisma.DeliveryEventGetPayload<object>;
