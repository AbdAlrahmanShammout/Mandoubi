import { useState, type FormEvent, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { getPharmacyStatement, recordReceipt } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { InvoiceCurrency, PaymentMethod, PharmacyStatement, UnpaidInvoice } from '@/api/api-types';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { DetailParts } from '@/components/detail-parts';
import { useConfirm } from '@/components/confirm-dialog';
import { formatDateTime, formatGroupedDecimal, sumMoney } from '@/format/format-value';
import { formatMoney } from '@/orders/order-labels';
import { CatalogPage } from '@/shell/catalog-page';

const MAX_RECEIPT_INVOICES = 20;

/**
 * Pharmacy statement and a receipt that covers whole unpaid invoices only.
 * Calls the admin pharmacy statement and receipts controllers.
 */
export function PharmacyStatementPage(): ReactElement {
  const params = useParams();
  const pharmacyId = Number(params.pharmacyId);
  const isValid = Number.isInteger(pharmacyId) && pharmacyId > 0;
  const { data, errorMessage, isLoading, reload } = useLoad(isValid ? `statement-${pharmacyId}` : 'statement-invalid', () => (isValid ? getPharmacyStatement(pharmacyId) : Promise.reject(new Error('invalid'))), (error) => (isValid ? describeAdminError(error) : ''));
  if (!isValid) {
    return (
      <CatalogPage crumb="الحسابات" title="صيدلية غير صالحة" description="رقم الصيدلية غير مقبول." actionLabel="الحسابات" actionTo="/accounts">
        <PageBanner message="رقم الصيدلية غير صالح." />
      </CatalogPage>
    );
  }
  return (
    <CatalogPage crumb={`الحسابات / صيدلية ${pharmacyId}`} title={data?.pharmacyName ?? `صيدلية #${pharmacyId}`} description="المبالغ تبقى بعملة الفاتورة. تاريخ الاستحقاق هو وقت التسليم." actionLabel="الحسابات" actionTo="/accounts">
      <PageBanner message={errorMessage} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && <StatementBody statement={data} onSaved={reload} />}
    </CatalogPage>
  );
}

function StatementBody({ statement, onSaved }: { readonly statement: PharmacyStatement; readonly onSaved: () => void }): ReactElement {
  return (
    <div className="detail-page">
      <div className="money-summary">
        {statement.currencies.map((currency) => (
          <article key={currency.currency} className="catalog-form-section">
            <h5>{currency.currency === 'USD' ? 'USD' : 'ل.س'}</h5>
            <p>افتتاحي {formatGroupedDecimal(currency.openingBalance)}</p>
            <p>قيود {formatGroupedDecimal(currency.charges)}</p>
            <p>دفعات {formatGroupedDecimal(currency.payments)}</p>
            <p>متبقي {formatGroupedDecimal(currency.outstanding)}</p>
          </article>
        ))}
      </div>
      <div className="catalog-table-card">
        <div className="catalog-table-meta">
          <span>حركات الكشف</span>
        </div>
        <table className="orders-table">
          <thead>
            <tr>
              <th className="cell-center">النوع</th>
              <th>المبلغ</th>
              <th>الوقت</th>
              <th className="cell-center">الفاتورة</th>
              <th className="cell-center">الدفعة</th>
            </tr>
          </thead>
          <tbody>
            {statement.currencies.flatMap((currency) => currency.entries).map((entry, index) => (
              <tr key={`${entry.kind}-${entry.occurredAt}-${index}`}>
                <td className="cell-center">{entryKindLabel(entry.kind)}</td>
                <td>{formatMoney(entry.amount, entry.currency)}</td>
                <td>{formatDateTime(entry.occurredAt)}</td>
                <td className="cell-center">{entry.invoiceId ? `#${entry.invoiceId}` : '—'}</td>
                <td className="cell-center">{entry.paymentId ? `#${entry.paymentId}` : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {statement.currencies.every((currency) => currency.entries.length === 0) && (
          <div className="ds-empty">
            <b>لا توجد حركات</b>
          </div>
        )}
      </div>
      <ReceiptForm statement={statement} onSaved={onSaved} />
    </div>
  );
}

function ReceiptForm({ statement, onSaved }: { readonly statement: PharmacyStatement; readonly onSaved: () => void }): ReactElement {
  const confirm = useConfirm();
  const currencies = uniqueCurrencies(statement.unpaidInvoices);
  const [currency, setCurrency] = useState<InvoiceCurrency>(currencies[0] ?? 'SYP');
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [receiver, setReceiver] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const visible = statement.unpaidInvoices.filter((invoice) => invoice.currency === currency);
  const chosen = visible.filter((invoice) => selected.includes(invoice.invoiceId));
  const amount = sumMoney(chosen.map((invoice) => invoice.amount));
  const toggle = (invoiceId: number): void => {
    setSelected((current) => (current.includes(invoiceId) ? current.filter((id) => id !== invoiceId) : [...current, invoiceId]));
  };
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (chosen.length === 0 || chosen.length > MAX_RECEIPT_INVOICES) {
      setErrorMessage('اختر من فاتورة واحدة حتى 20 فاتورة بعملة واحدة.');
      return;
    }
    if (receiver.trim().length < 2 || receiver.trim().length > 120) {
      setErrorMessage('اسم المستلم من حرفين حتى 120.');
      return;
    }
    setErrorMessage('');
    const accepted = await confirm({
      title: 'تسجيل الإيصال؟',
      body: `المبلغ ${formatMoney(amount, currency)} يغطي الفواتير المختارة كاملة. لا يُقبل دفع جزء من فاتورة.`,
      confirmLabel: 'تسجيل الإيصال',
    });
    if (!accepted) {
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await recordReceipt({
        pharmacyId: statement.pharmacyId,
        currency,
        amount,
        receivedByName: receiver.trim(),
        paymentMethod: method,
        invoiceIds: chosen.map((invoice) => invoice.invoiceId),
      });
      setSelected([]);
      setReceiver('');
      onSaved();
    } catch (error) {
      setErrorMessage(describeAdminError(error));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <form className="catalog-form-section compact-entity-form" onSubmit={(event) => void submit(event)}>
      <h5>إيصال قبض</h5>
      <p className="image-note">يُرسل إلى متحكم الإيصالات. المبلغ يساوي مجموع الفواتير المختارة ولا يُعدَّل يدوياً.</p>
      <label className="field">
        العملة
        <select value={currency} onChange={(event) => { setCurrency(event.target.value as InvoiceCurrency); setSelected([]); }}>
          <option value="SYP">ل.س</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <div className="selectable-invoices">
        <header>
          <span>فواتير سُلّمت ولم تُحصَّل</span>
          <b>{chosen.length}</b>
        </header>
        {visible.length === 0 && <p className="invoice-status-note">لا توجد فواتير مستحقة بهذه العملة.</p>}
        {visible.map((invoice) => (
          <label key={invoice.invoiceId}>
            <input type="checkbox" checked={selected.includes(invoice.invoiceId)} onChange={() => toggle(invoice.invoiceId)} />
            <span>
              <b>فاتورة #{invoice.invoiceId}</b>
              <small>
                <DetailParts>
                  <span>طلب #{invoice.orderId}</span>
                  <span>تسليم {formatDateTime(invoice.deliveredAt)}</span>
                  <span>استحقاق {formatDateTime(invoice.dueDate)}</span>
                </DetailParts>
              </small>
            </span>
            <strong>
              {formatMoney(invoice.amount, invoice.currency)} {invoice.overdue && <Badge tone="red">متأخر</Badge>}
            </strong>
          </label>
        ))}
      </div>
      <p className="full-payment-rule">المبلغ الكامل: {formatMoney(amount, currency)}</p>
      <label className="field">
        المستلم
        <input value={receiver} onChange={(event) => setReceiver(event.target.value)} />
      </label>
      <div className="fields-grid">
        <label className={`radio ${method === 'CASH' ? 'active' : ''}`}>
          <input type="radio" checked={method === 'CASH'} onChange={() => setMethod('CASH')} />
          نقداً
        </label>
        <label className={`radio ${method === 'BANK_TRANSFER' ? 'active' : ''}`}>
          <input type="radio" checked={method === 'BANK_TRANSFER'} onChange={() => setMethod('BANK_TRANSFER')} />
          تحويل
        </label>
      </div>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <button type="submit" className="ds-btn ds-primary" disabled={isSaving || chosen.length === 0}>
        تسجيل الإيصال
      </button>
    </form>
  );
}

function uniqueCurrencies(invoices: readonly UnpaidInvoice[]): InvoiceCurrency[] {
  return [...new Set(invoices.map((invoice) => invoice.currency))];
}

function entryKindLabel(kind: string): string {
  if (kind === 'CHARGE') {
    return 'قيد';
  }
  if (kind === 'DRIVER_COLLECTION') {
    return 'تحصيل سائق';
  }
  return 'إيصال';
}
