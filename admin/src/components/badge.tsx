import type { ReactElement, ReactNode } from 'react';

interface BadgeProps {
  readonly children: ReactNode;
  readonly tone?: string;
}

/**
 * Status chip from the operations direction.
 */
export function Badge({ children, tone = 'neutral' }: BadgeProps): ReactElement {
  return (
    <span className={`badge badge-${tone}`}>
      <span className="status-dot" />
      {children}
    </span>
  );
}
