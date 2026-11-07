import type { ProductCategory, SaleUnit } from '@/api/api-types';

export const CATEGORY_OPTIONS: readonly { readonly value: ProductCategory; readonly label: string }[] = [
  { value: 'NATIONAL_MEDICINE', label: 'أدوية وطنية' },
  { value: 'FOREIGN_MEDICINE', label: 'أدوية أجنبية' },
  { value: 'ACCESSORY', label: 'إكسسوارات' },
];

export const SALE_UNIT_OPTIONS: readonly { readonly value: SaleUnit; readonly label: string }[] = [
  { value: 'PACK', label: 'عبوة' },
  { value: 'BOX', label: 'علبة' },
  { value: 'SACHET', label: 'ظرف' },
];

/**
 * Arabic label for a product category.
 */
export function categoryLabel(category: ProductCategory): string {
  return CATEGORY_OPTIONS.find((option) => option.value === category)?.label ?? category;
}

/**
 * Arabic label for a sale unit.
 */
export function saleUnitLabel(saleUnit: SaleUnit): string {
  return SALE_UNIT_OPTIONS.find((option) => option.value === saleUnit)?.label ?? saleUnit;
}
