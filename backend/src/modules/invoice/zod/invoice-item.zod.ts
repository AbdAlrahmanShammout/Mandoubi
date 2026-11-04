import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { InvoiceCurrency } from '@/modules/product/enum/invoice-currency.enum';
import { SaleUnit } from '@/modules/product/enum/sale-unit.enum';

/**
 * Construction shape of one snapshotted invoice line.
 */
export const InvoiceItemZodSchema = BaseZodSchema.extend({
  invoiceId: z.number(),
  productId: z.number(),
  productName: z.string(),
  barcode: z.string(),
  saleUnit: z.nativeEnum(SaleUnit),
  paidQuantity: z.number(),
  freeQuantity: z.number(),
  totalQuantity: z.number(),
  unitPrice: z.string(),
  consumerUnitPrice: z.string(),
  currency: z.nativeEnum(InvoiceCurrency),
  lineAmount: z.string(),
  primaryWarehouseId: z.number(),
  offerPaidUnits: z.number().nullable(),
  offerFreeUnits: z.number().nullable(),
});

export type InvoiceItemZodType = z.infer<typeof InvoiceItemZodSchema>;
