import { useState, type FormEvent, type ReactElement } from 'react';
import { useParams } from 'react-router-dom';
import { getDriver, getDriverPosition, recordDriverSettlement } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { DriverCollection, DriverPosition, DriverRecord, InvoiceCurrency } from '@/api/api-types';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { useConfirm } from '@/components/confirm-dialog';
import { formatDateTime, sumMoney } from '@/format/format-value';
import { formatMoney } from '@/orders/order-labels';
import { CatalogPage } from '@/shell/catalog-page';

interface DriverAccount {
  readonly driver: DriverRecord;
  readonly position: DriverPosition;
}

/**
 * Driver position and a handover of whole collections.
 * Calls the admin driver and driver-settlement controllers.
 */
export function DriverSettlementPage(): ReactElement {
  const params = useParams();
  const driverId = Number(params.driverId);
  const isValid = Number.isInteger(driverId) && driverId > 0;
  const { data, errorMessage, isLoading, reload } = useLoad(isValid ? `driver-${driverId}` : 'driver-invalid', () => (isValid ? loadDriverAccount(driverId) : Promise.reject(new Error('invalid'))), (error) => (isValid ? describeAdminError(error) : ''));
  if (!isValid) {
    return (
      <CatalogPage crumb="الحسابات" title="سائق غير صالح" description="رقم السائق غير مقبول." actionLabel="الحسابات" actionTo="/accounts">
        <PageBanner message="رقم السائق غير صالح." />
      </CatalogPage>
    );
  }
  return (
    <CatalogPage crumb={`الحسابات / سائق ${driverId}`} title={data?.position.driverName ?? `سائق #${driverId}`} description="مبلغ التسليم يساوي التحصيلات المختارة. الخادم يسجّل وقت التسليم." actionLabel="الحسابات" actionTo="/accounts">
      <PageBanner message={errorMessage} onRetry={reload} />
      {isLoading && !data && (
        <div className="ds-empty">
          <b>جارٍ التحميل</b>
        </div>
      )}
      {data && <PositionBody driver={data.driver} position={data.position} onSaved={reload} />}
    </CatalogPage>
  );
}

function PositionBody({ driver, position, onSaved }: { readonly driver: DriverRecord; readonly position: DriverPosition; readonly onSaved: () => void }): ReactElement {
  return (
    <div className="detail-page">
      <section className="order-summary">
        <div className="summary-stat">
          <small>الحالة</small>
          <Badge tone={driver.status === 'ACTIVE' ? 'green' : 'red'}>{driver.status === 'ACTIVE' ? 'فعّال' : 'متوقف'}</Badge>
          <em>{driver.mobileNumber}</em>
        </div>
        <div className="summary-stat">
          <small>مسندة</small>
          <strong>{position.assignedCount}</strong>
        </div>
        <div className="summary-stat">
          <small>سُلّمت ومدفوعة</small>
          <strong>{position.deliveredPaidCount}</strong>
        </div>
        <div className="summary-stat">
          <small>سُلّمت وغير مدفوعة / لم تُسلّم</small>
          <strong>
            {position.deliveredUnpaidCount} / {position.notDeliveredCount}
          </strong>
        </div>
      </section>
      <div className="money-summary">
        {position.holdings.map((holding) => (
          <article key={holding.currency} className="catalog-form-section">
            <h5>{holding.currency === 'USD' ? 'USD' : 'ل.س'}</h5>
            <p>حُصّل {holding.collected}</p>
            <p>سُلّم {holding.handedOver}</p>
            <p>متبقٍ {holding.held}</p>
          </article>
        ))}
      </div>
      <HandoverForm position={position} onSaved={onSaved} />
    </div>
  );
}

function HandoverForm({ position, onSaved }: { readonly position: DriverPosition; readonly onSaved: () => void }): ReactElement {
  const confirm = useConfirm();
  const openCollections = position.collections.filter((collection) => !collection.settled);
  const currencies = [...new Set(openCollections.map((collection) => collection.currency))];
  const [currency, setCurrency] = useState<InvoiceCurrency>(currencies[0] ?? 'SYP');
  const [selected, setSelected] = useState<readonly number[]>([]);
  const [receiver, setReceiver] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const visible = openCollections.filter((collection) => collection.currency === currency);
  const chosen = visible.filter((collection) => selected.includes(collection.paymentId));
  const amount = sumMoney(chosen.map((collection) => collection.amount));
  const toggle = (paymentId: number): void => {
    setSelected((current) => (current.includes(paymentId) ? current.filter((id) => id !== paymentId) : [...current, paymentId]));
  };
  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (chosen.length === 0) {
      setErrorMessage('اختر تحصيلاً واحداً على الأقل.');
      return;
    }
    if (receiver.trim().length < 2 || receiver.trim().length > 120) {
      setErrorMessage('اسم المستلم من حرفين حتى 120.');
      return;
    }
    setErrorMessage('');
    const accepted = await confirm({
      title: 'تسجيل تسليم السائق؟',
      body: `المبلغ ${formatMoney(amount, currency)} يغطي التحصيلات المختارة كاملة. لا يمكن تسليم التحصيل نفسه مرتين.`,
      confirmLabel: 'تسجيل التسليم',
    });
    if (!accepted) {
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      const settlement = await recordDriverSettlement({
        driverId: position.driverId,
        currency,
        amount,
        receivedByName: receiver.trim(),
        paymentIds: chosen.map((collection) => collection.paymentId),
      });
      setSavedAt(settlement.occurredAt);
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
      <h5>تسليم النقد</h5>
      <p className="image-note">يُرسل إلى متحكم تسويات السائقين. الوقت يُختم عند الحفظ ولا يُدخل يدوياً.</p>
      {savedAt && <p className="invoice-status-note">سُجّل التسليم في {formatDateTime(savedAt)}.</p>}
      <label className="field">
        العملة
        <select value={currency} onChange={(event) => { setCurrency(event.target.value as InvoiceCurrency); setSelected([]); }}>
          <option value="SYP">ل.س</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <CollectionList collections={visible} selected={selected} onToggle={toggle} />
      <p className="full-payment-rule">المبلغ الكامل: {formatMoney(amount, currency)}</p>
      <label className="field">
        المستلم
        <input value={receiver} onChange={(event) => setReceiver(event.target.value)} />
      </label>
      {errorMessage && <p className="form-error">{errorMessage}</p>}
      <button type="submit" className="ds-btn ds-primary" disabled={isSaving || chosen.length === 0}>
        تسجيل التسليم
      </button>
    </form>
  );
}

function CollectionList({ collections, selected, onToggle }: { readonly collections: readonly DriverCollection[]; readonly selected: readonly number[]; readonly onToggle: (paymentId: number) => void }): ReactElement {
  if (collections.length === 0) {
    return <p className="invoice-status-note">لا توجد تحصيلات غير مسلّمة بهذه العملة.</p>;
  }
  return (
    <div className="selectable-invoices">
      <header>
        <span>تحصيلات لم تُسلَّم</span>
        <b>{selected.length}</b>
      </header>
      {collections.map((collection) => (
        <label key={collection.paymentId}>
          <input type="checkbox" checked={selected.includes(collection.paymentId)} onChange={() => onToggle(collection.paymentId)} />
          <span>
            <b>تحصيل #{collection.paymentId}</b>
            <small>فواتير {collection.invoiceIds.map((id) => `#${id}`).join('، ')}</small>
          </span>
          <strong>{formatMoney(collection.amount, collection.currency)}</strong>
        </label>
      ))}
    </div>
  );
}

async function loadDriverAccount(driverId: number): Promise<DriverAccount> {
  const [driver, position] = await Promise.all([getDriver(driverId), getDriverPosition(driverId)]);
  return { driver, position };
}
