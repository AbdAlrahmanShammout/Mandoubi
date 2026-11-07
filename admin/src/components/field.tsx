import type { ReactElement, ReactNode } from 'react';

interface FieldProps {
  readonly label: string;
  readonly required?: boolean;
  readonly error?: string;
  readonly children: ReactNode;
  readonly className?: string;
}

/**
 * Labeled control used by sign-in and catalog forms.
 */
export function Field({ label, required = false, error, children, className = '' }: FieldProps): ReactElement {
  return (
    <label className={`field ${error ? 'field-error' : ''} ${className}`}>
      <span>
        {label}
        {required && <b> *</b>}
      </span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
