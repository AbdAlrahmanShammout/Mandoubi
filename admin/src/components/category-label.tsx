import type { ReactElement } from 'react';
import type { ProductCategory } from '@/api/api-types';
import { Icon } from '@/components/icon';

const CATEGORIES: Record<ProductCategory, readonly [string, string, string]> = {
  NATIONAL_MEDICINE: ['أدوية وطنية', 'categoryNational', 'national'],
  FOREIGN_MEDICINE: ['أدوية أجنبية', 'categoryForeign', 'foreign'],
  ACCESSORY: ['إكسسوارات', 'categoryAccessory', 'accessory'],
};

interface CategoryLabelProps {
  readonly kind: ProductCategory;
  readonly compact?: boolean;
}

/**
 * Category chip with the icon used in the product table and form.
 */
export function CategoryLabel({ kind, compact = false }: CategoryLabelProps): ReactElement {
  const [label, icon, tone] = CATEGORIES[kind];
  return (
    <span className={`category-label category-${tone} ${compact ? 'compact' : ''}`}>
      <span className="category-icon">
        <Icon name={icon} size={compact ? 12 : 14} />
      </span>
      <b>{label}</b>
    </span>
  );
}
