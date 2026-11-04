import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { orderDetailsInclude } from '@/modules/order/types/order-details.include';

/** Persistence payload that can construct an order, its pharmacy, and its invoices. */
export type OrderType = OptionalRelations<Prisma.OrderGetPayload<{ include: typeof orderDetailsInclude }>>;
