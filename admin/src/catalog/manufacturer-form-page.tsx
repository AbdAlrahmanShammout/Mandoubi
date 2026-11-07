import { useState, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createManufacturer, getManufacturer, renameManufacturer, updateManufacturerStatus } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { useConfirm } from '@/components/confirm-dialog';
import { Field } from '@/components/field';
import { SectionTitle } from '@/components/section-title';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Creates a manufacturer or renames an existing one and changes its status.
 */
export function ManufacturerFormPage(): ReactElement {
  const params = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const isCreate = params.manufacturerId === undefined;
  const manufacturerId = Number(params.manufacturerId);
  const loaded = useLoad(isCreate ? 'new-manufacturer' : `manufacturer-${manufacturerId}`, () => (isCreate ? Promise.resolve(null) : getManufacturer(manufacturerId)), describeAdminError);
  const [name, setName] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const currentName = name ?? loaded.data?.name ?? '';
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const trimmed = currentName.trim();
    if (trimmed.length < 2 || trimmed.length > 160) {
      setErrorMessage('اسم الشركة يجب أن يكون بين حرفين و 160 حرفاً.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    const request = isCreate ? createManufacturer(trimmed) : renameManufacturer(manufacturerId, trimmed);
    void request
      .then((manufacturer) => navigate(`/manufacturers/${manufacturer.id}`, { replace: isCreate }))
      .catch((error: unknown) => setErrorMessage(describeAdminError(error)))
      .finally(() => setIsSaving(false));
  };
  const changeStatus = (): void => {
    if (!loaded.data) {
      return;
    }
    const nextStatus = loaded.data.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    void confirm({
      title: nextStatus === 'DISABLED' ? 'تأكيد إيقاف الشركة؟' : 'تأكيد تفعيل الشركة؟',
      body: nextStatus === 'DISABLED' ? 'لن تعود متاحة عند إنشاء أو تعديل المنتجات. المنتجات الحالية لا تُحذف.' : 'ستعود الشركة متاحة للاختيار في المنتجات.',
      confirmLabel: nextStatus === 'DISABLED' ? 'تأكيد الإيقاف' : 'تأكيد التفعيل',
      danger: nextStatus === 'DISABLED',
    }).then(async (accepted) => {
      if (!accepted) {
        return;
      }
      try {
        await updateManufacturerStatus(manufacturerId, nextStatus);
        loaded.reload();
      } catch (error) {
        setErrorMessage(describeAdminError(error));
      }
    });
  };
  return (
    <CatalogPage crumb="الكتالوج / الشركات المصنعة" title={isCreate ? 'إضافة شركة' : currentName || 'الشركة المصنعة'} description="إنشاء الشركة أو تعديل اسمها وحالتها.">
      <PageBanner message={loaded.errorMessage || errorMessage} onRetry={loaded.reload} />
      <form className="compact-entity-form" onSubmit={save}>
        <SectionTitle index="01" title="بيانات الشركة المصنعة" note="الاسم مطلوب ويجب أن يكون فريداً" />
        <Field label="اسم الشركة المصنعة" required error={errorMessage && !loaded.errorMessage ? errorMessage : undefined}>
          <input value={currentName} onChange={(event) => setName(event.target.value)} />
        </Field>
        {!isCreate && loaded.data && (
          <div className="entity-status-row">
            <span>
              <small>الحالة الحالية</small>
              <Badge tone={loaded.data.status === 'ACTIVE' ? 'green' : 'neutral'}>{loaded.data.status === 'ACTIVE' ? 'فعّال' : 'متوقف'}</Badge>
            </span>
            <button type="button" className={`ds-btn ${loaded.data.status === 'ACTIVE' ? 'ds-danger' : 'ds-secondary'}`} onClick={changeStatus}>
              {loaded.data.status === 'ACTIVE' ? 'إيقاف الشركة' : 'تفعيل الشركة'}
            </button>
          </div>
        )}
        <div className="entity-form-actions">
          <Link className="ds-btn ds-secondary" to="/manufacturers">
            إلغاء
          </Link>
          <button type="submit" className="ds-btn ds-primary" disabled={isSaving}>
            {isCreate ? 'حفظ الشركة' : 'حفظ الاسم'}
          </button>
        </div>
        <p>إيقاف الشركة يمنع اختيارها لمنتج جديد. لا يوجد إجراء حذف.</p>
      </form>
    </CatalogPage>
  );
}
