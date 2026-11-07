import { useDeferredValue, useState, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { searchProducts } from '@/api/admin-api-client';
import { describeAdminError } from '@/api/admin-api-error';
import type { ProductAvailability, ProductCategory, ProductRecord, ProductStatus } from '@/api/api-types';
import { saleUnitLabel } from '@/catalog/catalog-labels';
import { Pagination, ServerSearch } from '@/catalog/list-controls';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { Badge } from '@/components/badge';
import { CategoryLabel } from '@/components/category-label';
import { Icon } from '@/components/icon';
import { formatGroupedDecimal } from '@/format/format-value';
import { CatalogPage } from '@/shell/catalog-page';

/**
 * Product list searched and paged by the server.
 */
export function ProductListPage(): ReactElement {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('ALL');
  const [availability, setAvailability] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const search = useDeferredValue(query).trim();
  const offset = (page - 1) * pageSize;
  const { data, errorMessage, isLoading, reload } = useLoad(
    `products-${search}-${category}-${availability}-${status}-${offset}-${pageSize}`,
    () => searchProducts({
      search,
      category: category === 'ALL' ? undefined : category as ProductCategory,
      availability: availability === 'ALL' ? undefined : availability as ProductAvailability,
      status: status === 'ALL' ? undefined : status as ProductStatus,
      limit: pageSize,
      offset,
    }),
    describeAdminError,
  );
  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const hasFilter = search.length > 0 || category !== 'ALL' || availability !== 'ALL' || status !== 'ALL';
  return (
    <CatalogPage crumb="الكتالوج / المنتجات" title="المنتجات" description="إدارة المنتجات والأسعار والمخزون في المستودعات." actionLabel="إضافة منتج" actionTo="/products/new">
      <PageBanner message={errorMessage} onRetry={reload} />
      <div className="catalog-tools">
        <ServerSearch
          label="بحث المنتجات"
          placeholder="الاسم أو الباركود أو المادة الفعالة"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setPage(1);
          }}
        />
        <Filter label="الفئة" value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[['ALL', 'كل الفئات'], ['NATIONAL_MEDICINE', 'أدوية وطنية'], ['FOREIGN_MEDICINE', 'أدوية أجنبية'], ['ACCESSORY', 'إكسسوارات']]} />
        <Filter label="التوفر" value={availability} onChange={(value) => { setAvailability(value); setPage(1); }} options={[['ALL', 'الكل'], ['AVAILABLE', 'متوفر'], ['UNAVAILABLE', 'غير متوفر']]} />
        <Filter label="الحالة" value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[['ALL', 'الكل'], ['ACTIVE', 'فعّال'], ['DISABLED', 'متوقف']]} />
      </div>
      <div className="catalog-table-card">
        <div className="catalog-table-meta">
          <span>{total} منتجاً</span>
          <small>النتائج مرتبة بحسب آخر تعديل</small>
        </div>
        <table className="orders-table product-list-table">
          <thead>
            <tr>
              <th className="cell-center">الصورة</th>
              <th>المنتج</th>
              <th>الباركود</th>
              <th>الشركة المصنعة</th>
              <th className="cell-center">الفئة</th>
              <th className="cell-center">الوحدة</th>
              <th className="cell-center">التوفر</th>
              <th className="cell-center">الحالة</th>
              <th className="cell-center">عملة الفاتورة</th>
              <th>المستودع الأساسي</th>
              <th className="cell-center">المتاح</th>
              <th className="cell-center">العرض</th>
              <th className="cell-center" />
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <ProductRow key={product.id} product={product} onOpen={() => navigate(`/products/${product.id}`)} />
            ))}
          </tbody>
        </table>
        {!isLoading && total === 0 && (
          <div className="ds-empty">
            <span>
              <Icon name={hasFilter ? 'search' : 'products'} />
            </span>
            <b>{hasFilter ? 'لا توجد منتجات مطابقة' : 'لا توجد منتجات'}</b>
            <p>{hasFilter ? 'لا توجد نتائج لهذا البحث.' : 'أضف أول منتج بعد إنشاء شركة مصنّعة ومستودع.'}</p>
            {!hasFilter && (
              <Link className="ds-btn ds-secondary" to="/products/new">
                إضافة منتج
              </Link>
            )}
          </div>
        )}
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(next) => {
            setPageSize(next);
            setPage(1);
          }}
        />
      </div>
    </CatalogPage>
  );
}

function ProductRow({ product, onOpen }: { readonly product: ProductRecord; readonly onOpen: () => void }): ReactElement {
  const primary = product.stocks.find((stock) => stock.isPrimary);
  return (
    <tr>
      <td className="cell-center">
        <div className="table-thumbnail">{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.name.slice(0, 1)}</div>
      </td>
      <td>
        <b>{product.name}</b>
        <small>{product.activeIngredient}</small>
      </td>
      <td>
        <span className="barcode">{product.barcode}</span>
      </td>
      <td>{product.manufacturerName}</td>
      <td className="cell-center">
        <CategoryLabel kind={product.category as ProductCategory} compact />
      </td>
      <td className="cell-center">{saleUnitLabel(product.saleUnit)}</td>
      <td className="cell-center">
        <Badge tone={product.availability === 'AVAILABLE' ? 'green' : 'red'}>{availabilityLabel(product.availability)}</Badge>
      </td>
      <td className="cell-center">
        <Badge tone={product.status === 'ACTIVE' ? 'green' : 'neutral'}>{statusLabel(product.status)}</Badge>
      </td>
      <td className="cell-center">
        <b>{product.invoiceCurrency === 'SYP' ? 'ل.س' : 'USD'}</b>
      </td>
      <td>{primary?.warehouseName ?? '—'}</td>
      <td className="numeric-cell cell-center">
        <b>{formatGroupedDecimal(primary?.availableQuantity ?? 0)}</b>
      </td>
      <td className="cell-center">{product.offerActive ? <Badge tone="amber">عرض فعّال</Badge> : <span className="muted-dash">—</span>}</td>
      <td className="cell-center">
        <button type="button" className="icon-action" aria-label="فتح المنتج" onClick={onOpen}>
          <Icon name="arrow" />
        </button>
      </td>
    </tr>
  );
}

function Filter({ label, value, options, onChange }: { readonly label: string; readonly value: string; readonly options: readonly (readonly [string, string])[]; readonly onChange: (value: string) => void }): ReactElement {
  return (
    <label className="ds-filter">
      <small>{label}</small>
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
      >
        {options.map(([optionValue, optionLabel]) => (
          <option key={optionValue} value={optionValue}>
            {optionLabel}
          </option>
        ))}
      </select>
      <Icon name="chevron" size={14} />
    </label>
  );
}

function availabilityLabel(availability: ProductAvailability): string {
  return availability === 'AVAILABLE' ? 'متوفر' : 'غير متوفر';
}

function statusLabel(status: ProductStatus): string {
  return status === 'ACTIVE' ? 'فعّال' : 'متوقف';
}
