import type { FormEvent, ReactElement, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { CurrencyTotal } from '@/api/api-types';
import { formatMoney } from '@/orders/order-labels';

interface ReportPeriodFormProps {
  readonly from: string;
  readonly to: string;
  readonly errorMessage: string;
  readonly extra?: ReactNode;
  readonly onFromChange: (value: string) => void;
  readonly onToChange: (value: string) => void;
  readonly onSubmit: () => void;
}

/**
 * Required period for the sales, product, and debt reports.
 */
export function ReportPeriodForm({ from, to, errorMessage, extra, onFromChange, onToChange, onSubmit }: ReportPeriodFormProps): ReactElement {
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSubmit();
  };
  return (
    <form className="report-filters" onSubmit={submit}>
      <label className="field">
        من
        <input type="date" value={from} required onChange={(event) => onFromChange(event.target.value)} />
      </label>
      <label className="field">
        إلى
        <input type="date" value={to} required onChange={(event) => onToChange(event.target.value)} />
      </label>
      {extra}
      <button type="submit" className="ds-btn ds-primary">
        عرض التقرير
      </button>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
    </form>
  );
}

/**
 * One titled table. An empty group is a successful report, not an error.
 */
export function ReportSection({ title, isEmpty, emptyLabel, children }: { readonly title: string; readonly isEmpty: boolean; readonly emptyLabel: string; readonly children: ReactNode }): ReactElement {
  return (
    <section className="catalog-table-card">
      <div className="catalog-table-meta">
        <span>{title}</span>
      </div>
      {isEmpty ? (
        <div className="empty-report-period">
          <b>{emptyLabel}</b>
        </div>
      ) : (
        <table className="orders-table">{children}</table>
      )}
    </section>
  );
}

/**
 * Currency totals shown as stored, without converting through the exchange rate.
 */
export function MoneyTotals({ totals, emptyLabel }: { readonly totals: readonly CurrencyTotal[]; readonly emptyLabel: string }): ReactElement {
  if (totals.length === 0) {
    return (
      <div className="empty-report-period">
        <b>{emptyLabel}</b>
      </div>
    );
  }
  return (
    <div className="money-summary">
      {totals.map((total) => (
        <article key={total.currency} className="catalog-form-section">
          <h5>{total.currency === 'USD' ? 'USD' : 'ل.س'}</h5>
          <p>{formatMoney(total.amount, total.currency)}</p>
        </article>
      ))}
    </div>
  );
}

/**
 * Opens the pharmacy statement. There is no pharmacy list, so the id is the path.
 */
export function PharmacyLink({ pharmacyId, pharmacyName }: { readonly pharmacyId: number; readonly pharmacyName: string }): ReactElement {
  return <Link to={`/accounts/pharmacies/${pharmacyId}`}>{pharmacyName}</Link>;
}
