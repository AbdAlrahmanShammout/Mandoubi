import { useState, type FormEvent, type ReactElement } from 'react';
import { getExchangeRate, replaceExchangeRate } from '@/api/admin-api-client';
import { AdminApiError, describeAdminError } from '@/api/admin-api-error';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { useConfirm } from '@/components/confirm-dialog';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { SectionTitle } from '@/components/section-title';
import { formatDateTime, formatGroupedDecimal, normalizeRate } from '@/format/format-value';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Reads and replaces the single USD to Syrian-pound rate.
 */
export function ExchangeRatePage(): ReactElement {
  const confirm = useConfirm();
  const rate = useLoad('exchange-rate', () => getExchangeRate().catch((error: unknown) => {
    if (error instanceof AdminApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }), describeAdminError);
  const [value, setValue] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const currentValue = value ?? rate.data?.usdToSyp ?? '';
  const isFirstRate = rate.data === null && !rate.isLoading && !rate.errorMessage;
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const normalized = normalizeRate(currentValue);
    if (!normalized) {
      setErrorMessage('أدخل سعراً أكبر من صفر، وبحد أقصى أربع خانات عشرية.');
      return;
    }
    void confirm({
      title: isFirstRate ? 'حفظ أول سعر صرف؟' : 'تأكيد استبدال سعر الصرف؟',
      body: 'ستتغيّر أسعار الليرة المحسوبة تلقائياً. أسعار الليرة المدخلة يدوياً ستبقى ثابتة، والفواتير الحالية لن تتغير.',
      confirmLabel: 'تأكيد وحفظ السعر',
    }).then(async (accepted) => {
      if (!accepted) {
        return;
      }
      setIsSaving(true);
      setErrorMessage('');
      try {
        await replaceExchangeRate(normalized);
        setValue(null);
        rate.reload();
      } catch (error) {
        setErrorMessage(describeAdminError(error));
      } finally {
        setIsSaving(false);
      }
    });
  };
  return (
    <CatalogPage crumb="الإعدادات / سعر الصرف" title="سعر الصرف" description="عدد الليرات السورية المقابلة لدولار أمريكي واحد.">
      <PageBanner message={rate.errorMessage || errorMessage} onRetry={rate.reload} />
      <div className="exchange-layout">
        <section className="rate-card">
          <span>السعر الحالي</span>
          <div>
            <b>1 USD</b>
            <i>=</i>
            <strong>{rate.data ? <>{formatGroupedDecimal(rate.data.usdToSyp)} <small>ل.س</small></> : <small>غير محدد</small>}</strong>
          </div>
          <p>{rate.data ? `آخر تحديث: ${formatDateTime(rate.data.updatedAt)}` : 'لم يُحفظ سعر بعد.'}</p>
        </section>
        <form className="catalog-form-section rate-form" onSubmit={save}>
          <SectionTitle index="01" title={isFirstRate ? 'أول سعر صرف' : 'استبدال سعر الصرف'} note="هذا الإجراء يؤثر في المنتجات المرتبطة بالسعر" />
          <Field label={isFirstRate ? 'أول سعر' : 'سعر الدولار الجديد'} required>
            <span className="currency-input">
              <i>ل.س</i>
              <input value={currentValue} onChange={(event) => setValue(event.target.value)} inputMode="decimal" />
            </span>
          </Field>
          <button type="submit" className="ds-btn ds-primary" disabled={isSaving}>
            {isFirstRate ? 'حفظ أول سعر' : 'حفظ السعر الجديد'}
          </button>
        </form>
        {isFirstRate && (
          <section className="first-rate-state">
            <span className="spec-label">حالة الاستخدام الأول</span>
            <div>
              <Icon name="reports" />
              <span>
                <b>لم يُحدّد سعر صرف بعد</b>
                <small>أدخل أول قيمة ليبدأ حساب أسعار الليرة المرتبطة.</small>
              </span>
            </div>
          </section>
        )}
      </div>
    </CatalogPage>
  );
}
