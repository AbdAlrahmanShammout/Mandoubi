import type { ReactElement } from 'react';
import { CatalogPage } from '@/shell/catalog-page';
import { Icon } from '@/components/icon';

interface PlaceholderPageProps {
  readonly crumb: string;
  readonly title: string;
  readonly description: string;
}

/**
 * Navigation target that keeps the shell complete before that area is built.
 */
export function PlaceholderPage({ crumb, title, description }: PlaceholderPageProps): ReactElement {
  return (
    <CatalogPage crumb={crumb} title={title} description={description}>
      <div className="catalog-empty-state">
        <div className="ds-empty">
          <span>
            <Icon name="lock" />
          </span>
          <b>هذا القسم يُبنى في المرحلة التالية</b>
          <p>{description}</p>
        </div>
      </div>
    </CatalogPage>
  );
}
