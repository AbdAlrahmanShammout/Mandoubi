import { Children, type ReactElement, type ReactNode } from 'react';

interface DetailPartsProps {
  readonly children: ReactNode;
}

/**
 * Separates short facts on one line with a visible divider.
 */
export function DetailParts({ children }: DetailPartsProps): ReactElement {
  const parts = Children.toArray(children);
  return (
    <>
      {parts.map((part, index) => (
        <span key={index} className="detail-item">
          {part}
        </span>
      ))}
    </>
  );
}
