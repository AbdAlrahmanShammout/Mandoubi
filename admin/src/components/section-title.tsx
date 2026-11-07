import type { ReactElement } from 'react';

interface SectionTitleProps {
  readonly index: string;
  readonly title: string;
  readonly note: string;
}

/**
 * Numbered section heading inside a catalog form.
 */
export function SectionTitle({ index, title, note }: SectionTitleProps): ReactElement {
  return (
    <div className="section-title">
      <span>{index}</span>
      <div>
        <h5>{title}</h5>
        <p>{note}</p>
      </div>
    </div>
  );
}
