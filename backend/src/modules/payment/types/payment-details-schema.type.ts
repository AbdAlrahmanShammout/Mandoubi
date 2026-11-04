import { Prisma } from '@prisma/client';
import { OptionalRelations } from '@/common/base/optional-relations';
import { paymentDetailsInclude } from '@/modules/payment/types/payment-details.include';

/** Persistence payload that can construct a payment. */
export type PaymentType = OptionalRelations<Prisma.PaymentGetPayload<{ include: typeof paymentDetailsInclude }>>;
