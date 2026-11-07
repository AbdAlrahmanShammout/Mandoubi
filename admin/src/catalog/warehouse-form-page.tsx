import { useState, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createWarehouse, getWarehouse, listWarehouseProducts, updateWarehouse } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { Field } from '@/components/field';
import { SectionTitle } from '@/components/section-title';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Creates or edits a warehouse and lists the products stored in it.
 */
export function WarehouseFormPage(): ReactElement {
  const params = useParams();
  const navigate = useNavigate();
  const isCreate = params.warehouseId === undefined;
  const warehouseId = Number(params.warehouseId);
  const warehouse = useLoad(isCreate ? 'new-warehouse' : `warehouse-${warehouseId}`, () => (isCreate ? Promise.resolve(null) : getWarehouse(warehouseId)), describeAdminError);
  const products = useLoad(isCreate ? 'new-warehouse-products' : `warehouse-products-${warehouseId}`, () => (isCreate ? Promise.resolve([]) : listWarehouseProducts(warehouseId)), describeAdminError);
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const currentName = name ?? warehouse.data?.name ?? '';
  const currentAddress = address ?? warehouse.data?.address ?? '';
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (currentName.trim().length < 2 || currentAddress.trim().length < 2) {
      setErrorMessage('الاسم والعنوان مطلوبان، وكل منهما حرفان على الأقل.');
      return;
    }
    setIsSaving(true);
    setErrorMessage('');
    const input = { name: currentName.trim(), address: currentAddress.trim() };
    const request = isCreate ? createWarehouse(input) : updateWarehouse(warehouseId, input);
    void request
      .then((saved) => navigate(`/warehouses/${saved.id}`, { replace: isCreate }))
      .catch((error: unknown) => setErrorMessage(describeAdminError(error)))
      .finally(() => setIsSaving(false));
  };
  return (
    <CatalogPage crumb="الكتالوج / المستودعات" title={isCreate ? 'إضافة مستودع' : currentName || 'المستودع'} description="إنشاء المستودع وتعديل بياناته وعرض منتجاته.">
      <PageBanner message={warehouse.errorMessage || products.errorMessage || errorMessage} onRetry={warehouse.reload} />
      <div className="entity-form-layout">
        <form className="catalog-form-section entity-form-card" onSubmit={save}>
          <SectionTitle index="01" title="بيانات المستودع" note="النموذج نفسه للإنشاء والتعديل" />
          <Field label="اسم المستودع" required>
            <input value={currentName} onChange={(event) => setName(event.target.value)} />
          </Field>
          <label className="field">
            <span>
              العنوان <b>*</b>
            </span>
            <textarea value={currentAddress} onChange={(event) => setAddress(event.target.value)} />
          </label>
          <div>
            <Link className="ds-btn ds-secondary" to="/warehouses">
              إلغاء
            </Link>
            <button type="submit" className="ds-btn ds-primary" disabled={isSaving}>
              حفظ المستودع
            </button>
          </div>
          <p>لا تتوفر إجراءات تعطيل أو حذف للمستودع.</p>
        </form>
        {!isCreate && (
          <section className="catalog-table-card entity-products">
            <div className="catalog-table-meta">
              <span>منتجات المستودع</span>
              <small>{products.data?.length ?? 0} منتج</small>
            </div>
            <table className="orders-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>الباركود</th>
                  <th>الكمية</th>
                  <th>أساسي لهذا المنتج</th>
                </tr>
              </thead>
              <tbody>
                {(products.data ?? []).map((product) => (
                  <tr key={product.productId}>
                    <td>
                      <b>{product.productName}</b>
                    </td>
                    <td>
                      <span className="barcode">{product.barcode}</span>
                    </td>
                    <td className="numeric-cell">
                      <b>{product.quantity}</b>
                    </td>
                    <td>{product.isPrimary ? <Badge tone="green">المستودع الأساسي</Badge> : <span className="muted-dash">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {products.data && products.data.length === 0 && (
              <div className="ds-empty">
                <b>لا توجد منتجات في هذا المستودع</b>
                <p>تظهر المنتجات هنا بعد ربطها من نموذج المنتج.</p>
              </div>
            )}
          </section>
        )}
      </div>
    </CatalogPage>
  );
}
