import type { ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface CatalogPageProps {
  readonly crumb: string;
  readonly title: string;
  readonly description: string;
  readonly actionLabel?: string;
  readonly actionTo?: string;
  readonly children: ReactNode;
}

/**
 * Catalog page inside the shell, using the locked list and form header.
 */
export function CatalogPage({ crumb, title, description, actionLabel, actionTo, children }: CatalogPageProps): ReactElement {
  return (
    <>
      <header className="catalog-header">
        <div>
          <small>{crumb}</small>
          <h4>{title}</h4>
          <p>{description}</p>
        </div>
        {actionLabel && actionTo && (
          <Link className="ds-btn ds-primary" to={actionTo}>
            <span>＋</span> {actionLabel}
          </Link>
        )}
      </header>
      {children}
    </>
  );
}
