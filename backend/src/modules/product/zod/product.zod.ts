import { z } from 'zod';
import { BaseZodSchema } from '@/common/base/base.zod';
import { ProductAvailability } from '@/modules/product/enum/product-availability.enum';
import { ProductStatus } from '@/modules/product/enum/product-status.enum';

/**
 * Construction shape of a product. Stock and the manufacturer are attached after construction.
 */
export const ProductZodSchema = BaseZodSchema.extend({
  name: z.string(),
  barcode: z.string(),
  manufacturerId: z.number(),
  activeIngredient: z.string(),
  imageUrl: z.string().nullable(),
  minimumOrderQuantity: z.number(),
  maximumOrderQuantity: z.number(),
  lowQuantityThreshold: z.number(),
  availability: z.nativeEnum(ProductAvailability),
  status: z.nativeEnum(ProductStatus),
});

export type ProductZodType = z.infer<typeof ProductZodSchema>;
