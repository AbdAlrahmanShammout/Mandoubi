import { useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { readInteger } from '@/format/format-value';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Entry to pharmacy receipts and driver handovers. Neither account has a list endpoint.
 */
export function AccountsPage(): ReactElement {
  return (
    <CatalogPage crumb="الحسابات" title="الحسابات" description="لا توجد قائمة صيدليات أو سائقين. افتح الحساب برقمه.">
      <div className="accounts-entry">
        <IdCard title="كشف صيدلية وإيصال" hint="الإيصال يغطي فواتير كاملة سُلّمت ولم تُحصَّل." action="فتح الكشف" onOpen={(id) => `/accounts/pharmacies/${id}`} />
        <IdCard title="تسليم سائق" hint="التسليم يغطي تحصيلات كاملة، ويسجّل الخادم وقت التسليم." action="فتح الموقف" onOpen={(id) => `/accounts/drivers/${id}`} />
      </div>
    </CatalogPage>
  );
}

function IdCard({ title, hint, action, onOpen }: { readonly title: string; readonly hint: string; readonly action: string; readonly onOpen: (id: number) => string }): ReactElement {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const id = readInteger(value, 1);
    if (id === null) {
      setErrorMessage('أدخل رقماً صحيحاً.');
      return;
    }
    navigate(onOpen(id));
  };
  return (
    <form className="catalog-form-section" onSubmit={submit}>
      <h5>{title}</h5>
      <p className="image-note">{hint}</p>
      <label className="field">
        المعرّف
        <input value={value} inputMode="numeric" onChange={(event) => setValue(event.target.value)} />
      </label>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <button type="submit" className="ds-btn ds-primary">
        {action}
      </button>
    </form>
  );
}
