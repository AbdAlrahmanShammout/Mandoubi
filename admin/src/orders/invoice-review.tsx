import { useState, type FormEvent, type ReactElement } from 'react';
import { approveInvoice, getInvoice, rejectInvoice } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { InvoiceRecord, ProductRecord, RejectionReasonRecord, WarehouseRecord } from '@/api/api-types';
import { saleUnitLabel } from '@/catalog/catalog-labels';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { CategoryLabel } from '@/components/category-label';
import { Badge } from '@/components/badge';
import { useConfirm } from '@/components/confirm-dialog';
import { Icon } from '@/components/icon';
import { buildRejectInput, formatMoney, invoiceStatusLabel, readLineAvailability } from '@/orders/order-labels';

const CUSTOM_REASON_MAX_LENGTH = 500;

interface InvoiceReviewProps {
  readonly invoice: InvoiceRecord;
  readonly products: readonly ProductRecord[];
  readonly warehouses: readonly WarehouseRecord[];
  readonly reasons: readonly RejectionReasonRecord[];
  readonly onChanged: () => void;
}

/**
 * One category invoice: the submitted snapshot, the current availability at its stored warehouses, and the review decision.
 */
export function InvoiceReview({ invoice, products, warehouses, reasons, onChanged }: InvoiceReviewProps): ReactElement {
  const confirm = useConfirm();
  const loaded = useLoad(`invoice-${invoice.id}`, () => getInvoice(invoice.id), describeAdminError);
  const current = loaded.data ?? invoice;
  const [reasonId, setReasonId] = useState('');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusLabel, tone] = invoiceStatusLabel(current.status);
  const activeReasons = reasons.filter((reason) => reason.status === 'ACTIVE');
  const lines = current.items.map((item) => ({ item, availability: readLineAvailability(item, products, warehouses) }));
  const shortCount = lines.filter((line) => line.availability.isShort).length;
  const approve = async (): Promise<void> => {
    const accepted = await confirm({
      title: 'الموافقة على الفاتورة؟',
      body: shortCount > 0 ? 'بعض الأسطر كميتها أكبر من المتاح في المستودع المسجّل على الفاتورة. الموافقة تحجز الكمية وقد يرفضها الخادم.' : 'ستُحجز كمية كل سطر من المستودع المسجّل على الفاتورة.',
      confirmLabel: 'موافقة',
    });
    if (!accepted) {
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await approveInvoice(current.id);
      loaded.reload();
      onChanged();
    } catch (error) {
      setErrorMessage(describeAdminError(error));
    } finally {
      setIsSaving(false);
    }
  };
  const reject = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    const customReason = note.trim();
    if (customReason.length > CUSTOM_REASON_MAX_LENGTH) {
      setErrorMessage('الملاحظة أطول من 500 حرف.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    try {
      await rejectInvoice(current.id, buildRejectInput(reasonId, customReason));
      setReasonId('');
      setNote('');
      loaded.reload();
      onChanged();
    } catch (error) {
      setErrorMessage(describeAdminError(error));
    } finally {
      setIsSaving(false);
    }
  };
  return (
    <section className="invoice-open phase-open-invoice">
      <header>
        <span>
          <span>فاتورة الفئة</span>
          <h5>
            #{current.id} <CategoryLabel kind={current.category} compact />
          </h5>
          <p>الأسعار والكميات لقطة من لحظة الإرسال، ولا تتغير إذا تغيّر المنتج لاحقاً.</p>
        </span>
        <strong>
          {current.totals.length === 0 ? '—' : current.totals.map((total) => formatMoney(total.amount, total.currency)).join(' · ')}
        </strong>
        <Badge tone={tone}>{statusLabel}</Badge>
      </header>
      <div className="snapshot-banner">
        <Icon name="lock" size={16} />
        <span>
          <b>لقطة الفاتورة</b>
          <small>المستودع المعروض هو المستودع الذي خُزّن على السطر، حتى لو تغيّر المستودع الأساسي للمنتج بعد الإرسال.</small>
        </span>
      </div>
      <div className="line-table-wrap">
        <table className="line-table phase-line-table">
          <thead>
            <tr>
              <th>المنتج</th>
              <th>الباركود</th>
              <th>الوحدة</th>
              <th>المدفوع</th>
              <th>المجاني</th>
              <th>الإجمالي</th>
              <th>سعر الوحدة</th>
              <th>سعر المستهلك</th>
              <th>العملة</th>
              <th>مبلغ السطر</th>
              <th>العرض</th>
              <th>المستودع المسجّل</th>
              <th>المتاح الآن</th>
            </tr>
          </thead>
          <tbody>
            {lines.map(({ item, availability }) => (
              <tr key={item.id}>
                <td>
                  <b>{item.productName}</b>
                </td>
                <td>
                  <span className="barcode">{item.barcode}</span>
                </td>
                <td>{saleUnitLabel(item.saleUnit)}</td>
                <td className="numeric-cell">{item.paidQuantity}</td>
                <td className="numeric-cell">{item.freeQuantity}</td>
                <td className="numeric-cell">{item.totalQuantity}</td>
                <td className="numeric-cell">{item.unitPrice}</td>
                <td className="numeric-cell">{item.consumerUnitPrice}</td>
                <td>{item.currency === 'USD' ? 'USD' : 'ل.س'}</td>
                <td className="numeric-cell">{item.lineAmount}</td>
                <td>{item.offerPaidUnits === null ? '—' : `${item.offerPaidUnits} + ${item.offerFreeUnits ?? 0}`}</td>
                <td>
                  <b>{availability.warehouseName}</b>
                  <small>#{item.primaryWarehouseId}</small>
                </td>
                <td className={availability.isShort ? 'stock-short' : undefined}>{availability.availableQuantity === null ? 'غير معروف' : availability.availableQuantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PageBanner message={loaded.data ? '' : loaded.errorMessage} onRetry={loaded.reload} />
      {current.status === 'PENDING' && (
        <div className="invoice-actions phase-pending-actions">
          <div className="phase-action-heading">
            <div>
              <b>قرار المراجعة</b>
              <small>{shortCount > 0 ? `${shortCount} أسطر لا يكفي فيها المتاح في المستودع المسجّل.` : 'الموافقة تحجز الكمية من المستودع المسجّل على كل سطر.'}</small>
            </div>
            <button type="button" className="approve" disabled={isSaving} onClick={() => void approve()}>
              <Icon name="check" size={14} /> موافقة
            </button>
          </div>
          <div className="phase-action-forms">
          <form className="action-form expanded-action-form" onSubmit={(event) => void reject(event)}>
            <span>رفض الفاتورة</span>
            <label className="field">
              سبب جاهز
              <select value={reasonId} onChange={(event) => setReasonId(event.target.value)}>
                <option value="">بدون سبب جاهز</option>
                {activeReasons.map((reason) => (
                  <option key={reason.id} value={String(reason.id)}>
                    {reason.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              ملاحظة
              <textarea value={note} maxLength={CUSTOM_REASON_MAX_LENGTH} placeholder="اختياري، حتى 500 حرف" onChange={(event) => setNote(event.target.value)} />
            </label>
            <small>يمكن الرفض بسبب جاهز، أو بملاحظة، أو بدون سبب. السبب والنص معاً مقبولان أيضاً.</small>
            <button type="submit" className="reject" disabled={isSaving}>
              رفض الفاتورة
            </button>
          </form>
          </div>
        </div>
      )}
      {current.status === 'REJECTED' && (
        <div className="rejection-readonly">
          <span>
            <Icon name="close" size={16} />
          </span>
          <div>
            <small>سبب الرفض</small>
            <b>{current.rejectionReasonLabel ?? 'بدون سبب جاهز'}</b>
            <p>{current.customReason ?? 'بدون ملاحظة'}</p>
          </div>
        </div>
      )}
      {current.status !== 'PENDING' && current.status !== 'REJECTED' && <p className="invoice-status-note">{statusNote(current.status)}</p>}
      {errorMessage && <p className="form-error invoice-action-error">{errorMessage}</p>}
    </section>
  );
}

function statusNote(status: InvoiceRecord['status']): string {
  if (status === 'APPROVED') {
    return 'الفاتورة موافق عليها. إسنادها لسائق يُبنى في قسم التوزيع.';
  }
  if (status === 'RETURNED_TO_WAREHOUSE') {
    return 'الفاتورة عادت للمستودع. إرسالها مرة أخرى يُبنى في قسم التوزيع.';
  }
  return 'لا يوجد قرار مراجعة لهذه الحالة. نتيجة التسليم يسجّلها السائق.';
}
