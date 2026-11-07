import { useEffect, useState, type ReactElement } from 'react';

interface LoadState<T> {
  readonly data: T | null;
  readonly errorMessage: string;
  readonly isLoading: boolean;
  readonly reload: () => void;
}

/**
 * Loads one admin resource and keeps the last error message for the page banner.
 */
export function useLoad<T>(key: string, load: () => Promise<T>, describe: (error: unknown) => string): LoadState<T> {
  const [data, setData] = useState<T | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let isCurrent = true;
    setIsLoading(true);
    void load()
      .then((result) => {
        if (!isCurrent) {
          return;
        }
        setData(result);
        setErrorMessage('');
      })
      .catch((error: unknown) => {
        if (!isCurrent) {
          return;
        }
        setErrorMessage(describe(error));
      })
      .finally(() => {
        if (isCurrent) {
          setIsLoading(false);
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [key, attempt]);
  return {
    data,
    errorMessage,
    isLoading,
    reload: () => setAttempt((current) => current + 1),
  };
}

interface PageBannerProps {
  readonly message: string;
  readonly onRetry?: () => void;
}

/**
 * Business or network error shown above a catalog page.
 */
export function PageBanner({ message, onRetry }: PageBannerProps): ReactElement | null {
  if (!message) {
    return null;
  }
  return (
    <div className="ds-banner ds-error page-banner">
      <span>
        <b>تعذّرت العملية</b>
        <small>{message}</small>
      </span>
      {onRetry && (
        <button type="button" className="ds-btn ds-secondary" onClick={onRetry}>
          إعادة المحاولة
        </button>
      )}
    </div>
  );
}
