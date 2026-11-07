import { useState, type FormEvent, type ReactElement } from 'react';
import { assignDelivery, getDriver, returnInvoice } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { InvoiceRecord } from '@/api/api-types';
import { useConfirm } from '@/components/confirm-dialog';
import { readInteger } from '@/format/format-value';

interface InvoiceDispatchProps {
  readonly invoice: InvoiceRecord;
  readonly onChanged: () => void;
}

/**
 * Assigns an invoice or returns it, using the admin delivery and return controllers.
 */
export function InvoiceDispatch({ invoice, onChanged }: InvoiceDispatchProps): ReactElement | null {
  if (invoice.status === 'APPROVED' || invoice.status === 'RETURNED_TO_WAREHOUSE') {
    return <AssignForm invoice={invoice} onChanged={onChanged} />;
  }
  if (invoice.status === 'NOT_DELIVERED' || invoice.status === 'DELIVERED_UNPAID') {
    return <ReturnAction invoice={invoice} onChanged={onChanged} />;
  }
  return <p className="invoice-status-note">{idleNote(invoice.status)}</p>;
}

function AssignForm({ invoice, onChanged }: InvoiceDispatchProps): ReactElement {
  const confirm = useConfirm();
  const [driverId, setDriverId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const sendAgain = invoice.status === 'RETURNED_TO_WAREHOUSE';
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const id = readInteger(driverId, 1);
    if (id === null) {
      setErrorMessage('أدخل معرّف سائق صحيحاً. لا توجد قائمة سائقين في الخادم.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      const driver = await getDriver(id);
      if (driver.status !== 'ACTIVE') {
        setErrorMessage('حساب السائق متوقف ولا يمكن إسناد فاتورة إليه.');
        return;
      }
      const accepted = await confirm({
        title: sendAgain ? 'إرسال الفاتورة للتسليم مرة أخرى؟' : 'إسناد الفاتورة لهذا السائق؟',
        body: sendAgain ? `ستُحجز الكمية مرة أخرى وتخرج الفاتورة مع ${driver.name}. لا تُنشأ فاتورة جديدة.` : `ستُسند إلى ${driver.name} ولا يمكنه رفض المهمة أو تحويلها.`,
        confirmLabel: sendAgain ? 'إرسال للتسليم' : 'إسناد',
      });
      if (!accepted) {
        return;
      }
      await assignDelivery(invoice.id, id);
      onChanged();
    } catch (error) {
      setErrorMessage(describeAdminError(error));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <form className="driver-assignment" onSubmit={(event) => void submit(event)}>
      <label className="field">
        معرّف السائق
        <input value={driverId} inputMode="numeric" placeholder="لا توجد قائمة، أدخل المعرّف" onChange={(event) => setDriverId(event.target.value)} />
      </label>
      <button type="submit" className="ds-btn ds-primary" disabled={isSaving}>
        {sendAgain ? 'إرسال للتسليم' : 'إسناد لسائق'}
      </button>
      {errorMessage && <p className="form-error invoice-action-error">{errorMessage}</p>}
    </form>
  );
}

function ReturnAction({ invoice, onChanged }: InvoiceDispatchProps): ReactElement {
  const confirm = useConfirm();
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const submit = async (): Promise<void> => {
    const accepted = await confirm({
      title: 'إرجاع الفاتورة إلى المستودع؟',
      body: 'تتغير كمية المستودع المسجّل على الفاتورة مرة واحدة. لا يمكن تسجيل الإرجاع نفسه مرتين.',
      confirmLabel: 'إرجاع للمستودع',
      danger: true,
    });
    if (!accepted) {
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await returnInvoice(invoice.id);
      onChanged();
    } catch (error) {
      setErrorMessage(describeAdminError(error));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <div className="driver-assignment">
      <p className="invoice-status-note">يمكن إرجاع الفاتورة إذا لم تُحصَّل. التحصيل عند التسليم يمنع الإرجاع.</p>
      <button type="button" className="ds-btn ds-danger" disabled={isSaving} onClick={() => void submit()}>
        إرجاع للمستودع
      </button>
      {errorMessage && <p className="form-error invoice-action-error">{errorMessage}</p>}
    </div>
  );
}

function idleNote(status: InvoiceRecord['status']): string {
  if (status === 'ASSIGNED' || status === 'OUT_FOR_DELIVERY') {
    return 'الفاتورة عند السائق. نتيجة التسليم يسجّلها من تطبيقه، لا من هنا.';
  }
  if (status === 'DELIVERED_PAID') {
    return 'سُلّمت الفاتورة وحُصّلت. لا يوجد قرار إداري على هذه الحالة.';
  }
  return 'لا يوجد إجراء توزيع لهذه الحالة.';
}
