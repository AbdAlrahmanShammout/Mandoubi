import { createContext, useCallback, useContext, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { Icon } from '@/components/icon';

interface ConfirmRequest {
  readonly title: string;
  readonly body: string;
  readonly confirmLabel: string;
  readonly danger?: boolean;
}

interface ConfirmContextValue {
  readonly confirm: (request: ConfirmRequest) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Opens the shared confirmation dialog and resolves when the administrator decides.
 */
export function useConfirm(): (request: ConfirmRequest) => Promise<boolean> {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('Confirm dialog is unavailable');
  }
  return context.confirm;
}

/**
 * Hosts one confirmation dialog for sign-out and other hard-to-undo actions.
 */
export function ConfirmProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [resolver, setResolver] = useState<((accepted: boolean) => void) | null>(null);
  const confirm = useCallback((next: ConfirmRequest): Promise<boolean> => {
    setRequest(next);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);
  const close = (accepted: boolean): void => {
    resolver?.(accepted);
    setResolver(null);
    setRequest(null);
  };
  const value = useMemo(() => ({ confirm }), [confirm]);
  return (
    <ConfirmContext.Provider value={value}>
      {children}
      {request && (
        <div className="prototype-modal-backdrop">
          <section className="ds-dialog prototype-modal" role="dialog" aria-modal="true">
            <span className="dialog-icon">
              <Icon name={request.danger ? 'close' : 'check'} />
            </span>
            <h3>{request.title}</h3>
            <p>{request.body}</p>
            <div>
              <button type="button" className="ds-btn ds-secondary" onClick={() => close(false)}>
                تراجع
              </button>
              <button type="button" className={`ds-btn ${request.danger ? 'ds-danger' : 'ds-primary'}`} onClick={() => close(true)}>
                {request.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
