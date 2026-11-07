import type { ReactElement } from 'react';

interface ToggleProps {
  readonly on: boolean;
  readonly label: string;
  readonly onChange: (next: boolean) => void;
}

/**
 * Switch control. The visible state is the operations-direction toggle.
 */
export function Toggle({ on, label, onChange }: ToggleProps): ReactElement {
  return (
    <button type="button" className={`toggle ${on ? 'on' : ''}`} aria-pressed={on} aria-label={label} onClick={() => onChange(!on)}>
      <i />
    </button>
  );
}
