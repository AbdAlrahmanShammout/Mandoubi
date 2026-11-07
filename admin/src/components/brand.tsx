import type { ReactElement } from 'react';

interface BrandProps {
  readonly compact?: boolean;
}

/**
 * Mandoubi mark from the brand asset, with the operations-direction wordmark.
 */
export function Brand({ compact = false }: BrandProps): ReactElement {
  return (
    <div className={`brand ${compact ? 'brand-compact' : ''}`}>
      <img className="brand-logo" src="/brand/mandoubi-logo.svg" width={compact ? 30 : 38} height={compact ? 30 : 38} alt="" />
      {!compact && (
        <div>
          <strong>مندوبي</strong>
          <small>Mandoubi · إدارة التوزيع الدوائي</small>
        </div>
      )}
    </div>
  );
}
