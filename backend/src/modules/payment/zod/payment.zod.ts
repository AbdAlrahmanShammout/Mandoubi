import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { PaymentKind } from '@/modules/payment/enum/payment-kind.enum';
import { PaymentMethod } from '@/modules/payment/enum/payment-method.enum';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';

/**
 * Construction shape of one payment.
 */
export const PaymentZodSchema = BaseZodSchema.omit({ deletedAt: true }).extend({
  pharmacyId: z.number(),
  kind: z.nativeEnum(PaymentKind),
  currency: z.nativeEnum(InvoiceCurrency),
  amount: z.string(),
  receivedByName: z.string(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  driverId: z.number().nullable(),
  occurredAt: z.date(),
  settled: z.boolean(),
});

export type PaymentZodType = z.infer<typeof PaymentZodSchema>;
