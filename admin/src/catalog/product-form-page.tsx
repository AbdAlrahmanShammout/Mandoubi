import { useMemo, useState, type ChangeEvent, type FormEvent, type ReactElement } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createProduct, getExchangeRate, getProduct, listManufacturers, listWarehouses, replaceProductStocks, updateProduct } from '@/api/admin-api-client';
import { AdminApiError, describeAdminError } from '@/api/admin-api-error';
import type { InvoiceCurrency, ManufacturerRecord, ProductAvailability, ProductCategory, ProductRecord, ProductStatus, ProductStockInput, ProductWriteInput, SaleUnit, WarehouseRecord } from '@/api/api-types';
import { CATEGORY_OPTIONS, SALE_UNIT_OPTIONS } from '@/catalog/catalog-labels';
import { PageBanner, useLoad } from '@/catalog/page-state';
import { CategoryLabel } from '@/components/category-label';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';
import { SectionTitle } from '@/components/section-title';
import { Toggle } from '@/components/toggle';
import { formatDateTime, fromDateTimeLocal, normalizeMoney, previewSypPrice, readInteger, toDateTimeLocal } from '@/format/format-value';
import { CatalogPage } from '@/shell/catalog-page';

interface StockDraft {
  readonly key: string;
  readonly warehouseId: string;
  readonly quantity: string;
  readonly reservedQuantity: number;
  readonly isPrimary: boolean;
}

interface ProductDraft {
  readonly name: string;
  readonly barcode: string;
  readonly manufacturerId: string;
  readonly activeIngredient: string;
  readonly category: ProductCategory;
  readonly saleUnit: SaleUnit;
  readonly availability: ProductAvailability;
  readonly status: ProductStatus;
  readonly calculateSypFromRate: boolean;
  readonly pharmacyPriceUsd: string;
  readonly pharmacyPriceSyp: string;
  readonly consumerPriceUsd: string;
  readonly consumerPriceSyp: string;
  readonly invoiceCurrency: InvoiceCurrency;
  readonly minimumOrderQuantity: string;
  readonly maximumOrderQuantity: string;
  readonly lowQuantityThreshold: string;
  readonly offerActive: boolean;
  readonly offerPaidUnits: string;
  readonly offerFreeUnits: string;
  readonly offerStartsAt: string;
  readonly offerEndsAt: string;
  readonly stocks: readonly StockDraft[];
  readonly imageName: string;
}

const EMPTY_DRAFT: ProductDraft = {
  name: '',
  barcode: '',
  manufacturerId: '',
  activeIngredient: '',
  category: 'NATIONAL_MEDICINE',
  saleUnit: 'PACK',
  availability: 'AVAILABLE',
  status: 'ACTIVE',
  calculateSypFromRate: false,
  pharmacyPriceUsd: '',
  pharmacyPriceSyp: '',
  consumerPriceUsd: '',
  consumerPriceSyp: '',
  invoiceCurrency: 'SYP',
  minimumOrderQuantity: '1',
  maximumOrderQuantity: '100',
  lowQuantityThreshold: '0',
  offerActive: false,
  offerPaidUnits: '',
  offerFreeUnits: '',
  offerStartsAt: '',
  offerEndsAt: '',
  stocks: [],
  imageName: '',
};

/**
 * Creates or edits a product, including prices, the offer, and warehouse quantities.
 */
export function ProductFormPage(): ReactElement {
  const params = useParams();
  const navigate = useNavigate();
  const isCreate = params.productId === undefined;
  const productId = Number(params.productId);
  const product = useLoad(isCreate ? 'new-product' : `product-${productId}`, () => (isCreate ? Promise.resolve(null) : getProduct(productId)), describeAdminError);
  const manufacturers = useLoad('product-manufacturers', listManufacturers, describeAdminError);
  const warehouses = useLoad('product-warehouses', listWarehouses, describeAdminError);
  const rate = useLoad('product-rate', () => getExchangeRate().catch((error: unknown) => {
    if (error instanceof AdminApiError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }), describeAdminError);
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const current = draft ?? toDraft(product.data);
  const activeManufacturers = (manufacturers.data ?? []).filter((manufacturer) => manufacturer.status === 'ACTIVE' || manufacturer.id === product.data?.manufacturerId);
  const warehouseOptions = warehouses.data ?? [];
  const pharmacySyp = current.calculateSypFromRate ? previewSypPrice(current.pharmacyPriceUsd, rate.data?.usdToSyp ?? '') : current.pharmacyPriceSyp;
  const consumerSyp = current.calculateSypFromRate ? previewSypPrice(current.consumerPriceUsd, rate.data?.usdToSyp ?? '') : current.consumerPriceSyp;
  const update = (patch: Partial<ProductDraft>): void => {
    setDraft({ ...current, ...patch });
  };
  const chooseImage = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setErrorMessage('الصورة يجب أن تكون JPEG أو PNG أو WebP وبحجم لا يتجاوز 5 MB.');
      return;
    }
    setPreviewUrl(URL.createObjectURL(file));
    update({ imageName: file.name });
  };
  const save = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const built = buildProduct(current, isCreate);
    if ('errors' in built) {
      setFieldErrors(built.errors);
      setErrorMessage('راجع الحقول المعلّمة قبل الحفظ.');
      return;
    }
    setIsSaving(true);
    setFieldErrors({});
    setErrorMessage('');
    void saveProduct(isCreate ? null : productId, built.input, built.stocks)
      .then((saved) => navigate(`/products/${saved.id}`, { replace: true }))
      .catch((error: unknown) => setErrorMessage(describeAdminError(error)))
      .finally(() => setIsSaving(false));
  };
  if (!isCreate && product.isLoading) {
    return (
      <CatalogPage crumb="الكتالوج / المنتجات" title="المنتج" description="جارٍ تحميل بيانات المنتج.">
        <div className="ds-empty"><b>جارٍ التحميل</b></div>
      </CatalogPage>
    );
  }
  return (
    <CatalogPage crumb="الكتالوج / المنتجات" title={isCreate ? 'إضافة منتج' : current.name || 'تعديل المنتج'} description={isCreate ? 'إضافة منتج واحد إلى الكتالوج.' : 'تعديل بيانات المنتج والأسعار والمخزون.'}>
      <PageBanner message={product.errorMessage || manufacturers.errorMessage || warehouses.errorMessage || errorMessage} onRetry={product.reload} />
      <div className="catalog-form-toolbar">
        <span>{isCreate ? 'الحقول المعلّمة بـ * مطلوبة' : `آخر تعديل: ${product.data ? formatDateTime(product.data.updatedAt) : '—'}`}</span>
        <div>
          <Link className="ds-btn ds-secondary" to="/products">إلغاء</Link>
          <button type="submit" form="product-form" className="ds-btn ds-primary" disabled={isSaving}>
            <Icon name="save" /> حفظ المنتج
          </button>
        </div>
      </div>
      <form id="product-form" className="catalog-product-form" onSubmit={save}>
        <ImageSection isCreate={isCreate} currentImage={previewUrl ?? product.data?.imageUrl ?? null} imageName={current.imageName} onChoose={chooseImage} />
        <section className="catalog-form-section">
          <SectionTitle index="02" title="بيانات المنتج" note="الهوية والتصنيف وحالة العرض" />
          <div className="fields-grid">
            <Field label="اسم المنتج" required error={fieldErrors.name}><input value={current.name} onChange={(event) => update({ name: event.target.value })} /></Field>
            <Field label="الباركود" required error={fieldErrors.barcode}><input value={current.barcode} onChange={(event) => update({ barcode: event.target.value })} dir="ltr" /></Field>
            <Field label="الشركة المصنعة" required error={fieldErrors.manufacturerId}>
              <select value={current.manufacturerId} onChange={(event) => update({ manufacturerId: event.target.value })}>
                <option value="">اختر شركة</option>
                {activeManufacturers.map((manufacturer) => (
                  <option key={manufacturer.id} value={manufacturer.id}>{manufacturerLabel(manufacturer)}</option>
                ))}
              </select>
            </Field>
            <Field label="المادة الفعالة" required error={fieldErrors.activeIngredient}><input value={current.activeIngredient} onChange={(event) => update({ activeIngredient: event.target.value })} /></Field>
            <Field label="الفئة" required>
              <div className="category-field-control">
                <CategoryLabel kind={current.category} compact />
                <select value={current.category} onChange={(event) => update({ category: event.target.value as ProductCategory })}>
                  {CATEGORY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </Field>
            <Field label="وحدة البيع" required>
              <select value={current.saleUnit} onChange={(event) => update({ saleUnit: event.target.value as SaleUnit })}>
                {SALE_UNIT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </Field>
            {!isCreate && (
              <>
                <Field label="التوفر" required>
                  <select value={current.availability} onChange={(event) => update({ availability: event.target.value as ProductAvailability })}>
                    <option value="AVAILABLE">متوفر</option>
                    <option value="UNAVAILABLE">غير متوفر</option>
                  </select>
                </Field>
                <Field label="الحالة" required>
                  <select value={current.status} onChange={(event) => update({ status: event.target.value as ProductStatus })}>
                    <option value="ACTIVE">فعّال</option>
                    <option value="DISABLED">متوقف</option>
                  </select>
                </Field>
              </>
            )}
          </div>
        </section>
        <section className="catalog-form-section">
          <SectionTitle index="03" title="الأسعار وعملة الفاتورة" note="مبالغ مستقلة لكل عملة" />
          <div className="switch-row">
            <span>
              <b>حساب الليرة من سعر الصرف</b>
              <small>{current.calculateSypFromRate ? `مفعّل — ${rate.data ? `${rate.data.usdToSyp} ل.س لكل دولار` : 'لم يُحدَّد سعر صرف بعد'}` : 'متوقف — أسعار الليرة قابلة للتعديل'}</small>
            </span>
            <Toggle on={current.calculateSypFromRate} label="حساب الليرة من سعر الصرف" onChange={(on) => update({ calculateSypFromRate: on })} />
          </div>
          <div className="price-grid">
            <PricePair title="سعر الصيدلية" usd={current.pharmacyPriceUsd} syp={pharmacySyp} locked={current.calculateSypFromRate} usdError={fieldErrors.pharmacyPriceUsd} sypError={fieldErrors.pharmacyPriceSyp} onUsd={(value) => update({ pharmacyPriceUsd: value })} onSyp={(value) => update({ pharmacyPriceSyp: value })} />
            <PricePair title="سعر المستهلك" usd={current.consumerPriceUsd} syp={consumerSyp} locked={current.calculateSypFromRate} usdError={fieldErrors.consumerPriceUsd} sypError={fieldErrors.consumerPriceSyp} onUsd={(value) => update({ consumerPriceUsd: value })} onSyp={(value) => update({ consumerPriceSyp: value })} />
            <div className="invoice-currency">
              <h6>عملة الفاتورة <b>*</b></h6>
              <p>تُحفظ مع الفاتورة عند الطلب.</p>
              <CurrencyChoice value="SYP" current={current.invoiceCurrency} label="ليرة سورية" code="SYP" onChange={(invoiceCurrency) => update({ invoiceCurrency })} />
              <CurrencyChoice value="USD" current={current.invoiceCurrency} label="دولار أمريكي" code="USD" onChange={(invoiceCurrency) => update({ invoiceCurrency })} />
            </div>
          </div>
        </section>
        <section className="catalog-split-sections">
          <div className="catalog-form-section">
            <SectionTitle index="04" title="حدود الطلب" note="الكميات والتنبيه" />
            <div className="limit-grid">
              <Field label="الحد الأدنى" required error={fieldErrors.minimumOrderQuantity}><input value={current.minimumOrderQuantity} onChange={(event) => update({ minimumOrderQuantity: event.target.value })} inputMode="numeric" /></Field>
              <Field label="الحد الأقصى" required error={fieldErrors.maximumOrderQuantity}><input value={current.maximumOrderQuantity} onChange={(event) => update({ maximumOrderQuantity: event.target.value })} inputMode="numeric" /></Field>
              <Field label="تنبيه الكمية المنخفضة" required error={fieldErrors.lowQuantityThreshold}><input value={current.lowQuantityThreshold} onChange={(event) => update({ lowQuantityThreshold: event.target.value })} inputMode="numeric" /></Field>
            </div>
          </div>
          <div className="catalog-form-section">
            <SectionTitle index="05" title="العرض" note={current.offerActive ? 'العرض مفعّل لهذا المنتج فقط' : 'العرض متوقف حالياً'} />
            <div className="switch-row">
              <span>
                <b>تفعيل عرض</b>
                <small>الوحدات المجانية منفصلة عن الوحدات المدفوعة</small>
              </span>
              <Toggle on={current.offerActive} label="تفعيل عرض" onChange={(offerActive) => update({ offerActive })} />
            </div>
            <div className={current.offerActive ? 'fields-grid' : 'inactive-offer-fields'}>
              <Field label="وحدات مدفوعة" error={fieldErrors.offerPaidUnits}><input value={current.offerPaidUnits} disabled={!current.offerActive} onChange={(event) => update({ offerPaidUnits: event.target.value })} inputMode="numeric" /></Field>
              <Field label="وحدات مجانية" error={fieldErrors.offerFreeUnits}><input value={current.offerFreeUnits} disabled={!current.offerActive} onChange={(event) => update({ offerFreeUnits: event.target.value })} inputMode="numeric" /></Field>
              <Field label="البداية" error={fieldErrors.offerStartsAt}><input type="datetime-local" value={current.offerStartsAt} disabled={!current.offerActive} onChange={(event) => update({ offerStartsAt: event.target.value })} /></Field>
              <Field label="النهاية" error={fieldErrors.offerEndsAt}><input type="datetime-local" value={current.offerEndsAt} disabled={!current.offerActive} onChange={(event) => update({ offerEndsAt: event.target.value })} /></Field>
            </div>
          </div>
        </section>
        <StockSection stocks={current.stocks} warehouses={warehouseOptions} error={fieldErrors.stocks} onChange={(stocks) => update({ stocks })} />
      </form>
    </CatalogPage>
  );
}

function ImageSection({ isCreate, currentImage, imageName, onChoose }: { readonly isCreate: boolean; readonly currentImage: string | null; readonly imageName: string; readonly onChoose: (event: ChangeEvent<HTMLInputElement>) => void }): ReactElement {
  return (
    <div className="catalog-form-section">
      <SectionTitle index="01" title="صورة المنتج" note="صورة واحدة إلزامية للمنتج" />
      {isCreate && !currentImage ? (
        <div className="ds-uploader catalog-uploader">
          <Icon name="upload" />
          <b>اسحب الصورة هنا أو اختر ملفاً</b>
          <small>JPEG أو PNG أو WebP · حتى 5 MB</small>
          <label className="ds-btn ds-secondary">
            اختيار صورة
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChoose} />
          </label>
        </div>
      ) : (
        <div className="current-product-image">
          <div className="product-image-large">{currentImage ? <img src={currentImage} alt="" /> : <span>صورة</span>}</div>
          <div>
            <b>{imageName || 'الصورة الحالية'}</b>
            <p>{currentImage ? 'معاينة محلية أو الرابط المحفوظ' : 'لا توجد صورة محفوظة'}</p>
          </div>
          <label className="ds-btn ds-secondary">
            <Icon name="upload" /> استبدال الصورة
            <input type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={onChoose} />
          </label>
        </div>
      )}
      <p className="image-note">رفع الصورة إلى Amazon S3 غير موصول في الخادم بعد. اختيار الملف يبقي معاينة محلية ولا يُرسل رابط صورة.</p>
    </div>
  );
}

function PricePair({ title, usd, syp, locked, usdError, sypError, onUsd, onSyp }: { readonly title: string; readonly usd: string; readonly syp: string; readonly locked: boolean; readonly usdError?: string; readonly sypError?: string; readonly onUsd: (value: string) => void; readonly onSyp: (value: string) => void }): ReactElement {
  return (
    <div>
      <h6>{title} <b>*</b></h6>
      <Field label="دولار أمريكي" error={usdError}>
        <span className="currency-input"><i>USD</i><input value={usd} onChange={(event) => onUsd(event.target.value)} inputMode="decimal" /></span>
      </Field>
      <Field label="ليرة سورية" error={sypError}>
        <span className="currency-input"><i>ل.س</i><input value={syp} readOnly={locked} onChange={(event) => onSyp(event.target.value)} inputMode="decimal" /></span>
      </Field>
    </div>
  );
}

function CurrencyChoice({ value, current, label, code, onChange }: { readonly value: InvoiceCurrency; readonly current: InvoiceCurrency; readonly label: string; readonly code: string; readonly onChange: (value: InvoiceCurrency) => void }): ReactElement {
  return (
    <label className={`radio ${current === value ? 'active' : ''}`}>
      <input type="radio" name="invoice-currency" checked={current === value} onChange={() => onChange(value)} />
      <span>{label} <small>{code}</small></span>
    </label>
  );
}

function StockSection({ stocks, warehouses, error, onChange }: { readonly stocks: readonly StockDraft[]; readonly warehouses: readonly WarehouseRecord[]; readonly error?: string; readonly onChange: (stocks: readonly StockDraft[]) => void }): ReactElement {
  const usedIds = useMemo(() => new Set(stocks.map((stock) => stock.warehouseId)), [stocks]);
  const setPrimary = (key: string): void => {
    onChange(stocks.map((stock) => ({ ...stock, isPrimary: stock.key === key })));
  };
  const addStock = (): void => {
    const available = warehouses.find((warehouse) => !usedIds.has(String(warehouse.id)));
    if (!available) {
      return;
    }
    const next: StockDraft = { key: `new-${available.id}`, warehouseId: String(available.id), quantity: '0', reservedQuantity: 0, isPrimary: stocks.length === 0 };
    onChange(stocks.length === 0 ? [next] : [...stocks, { ...next, isPrimary: false }]);
  };
  return (
    <section className="catalog-form-section">
      <SectionTitle index="06" title="المستودعات" note="المتاح = الكمية الفعلية − المحجوزة" />
      {warehouses.length === 0 ? (
        <p>أضف مستودعاً أولاً قبل حفظ المنتج. <Link to="/warehouses/new">إضافة مستودع</Link></p>
      ) : (
        <div className="warehouse-table catalog-stock-table">
          <div className="warehouse-head">
            <span>المستودع</span><span>الكمية الفعلية</span><span>المحجوز</span><span>المتاح</span><span>المستودع الأساسي</span>
          </div>
          {stocks.map((stock) => {
            const quantity = readInteger(stock.quantity, 0) ?? 0;
            const available = Math.max(0, quantity - stock.reservedQuantity);
            return (
              <div className="warehouse-row" key={stock.key}>
                <select value={stock.warehouseId} onChange={(event) => onChange(stocks.map((item) => item.key === stock.key ? { ...item, warehouseId: event.target.value } : item))}>
                  {warehouses.filter((warehouse) => String(warehouse.id) === stock.warehouseId || !usedIds.has(String(warehouse.id))).map((warehouse) => (
                    <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>
                  ))}
                </select>
                <input value={stock.quantity} inputMode="numeric" onChange={(event) => onChange(stocks.map((item) => item.key === stock.key ? { ...item, quantity: event.target.value } : item))} />
                <span>{stock.reservedQuantity}</span>
                <strong>{available}</strong>
                {stocks.length === 1 ? (
                  <span>أساسي</span>
                ) : (
                  <label className="primary-radio">
                    <input type="radio" name="primary-warehouse" checked={stock.isPrimary} onChange={() => setPrimary(stock.key)} /> {stock.isPrimary ? 'أساسي' : 'تعيين كأساسي'}
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}
      {error && <p className="form-error">{error}</p>}
      <div className="stock-rules">
        <span><Icon name="check" /> مستودع أساسي واحد بالضبط.</span>
        <span><Icon name="lock" /> لا يمكن خفض الكمية الفعلية عن المحجوزة.</span>
      </div>
      {warehouses.some((warehouse) => !usedIds.has(String(warehouse.id))) && (
        <button type="button" className="ds-btn ds-secondary stock-add" onClick={addStock}>إضافة مستودع</button>
      )}
    </section>
  );
}

function toDraft(product: ProductRecord | null): ProductDraft {
  if (!product) {
    return EMPTY_DRAFT;
  }
  return {
    name: product.name,
    barcode: product.barcode,
    manufacturerId: String(product.manufacturerId),
    activeIngredient: product.activeIngredient,
    category: product.category,
    saleUnit: product.saleUnit,
    availability: product.availability,
    status: product.status,
    calculateSypFromRate: product.calculateSypFromRate,
    pharmacyPriceUsd: product.pharmacyPriceUsd,
    pharmacyPriceSyp: product.pharmacyPriceSyp,
    consumerPriceUsd: product.consumerPriceUsd,
    consumerPriceSyp: product.consumerPriceSyp,
    invoiceCurrency: product.invoiceCurrency,
    minimumOrderQuantity: String(product.minimumOrderQuantity),
    maximumOrderQuantity: String(product.maximumOrderQuantity),
    lowQuantityThreshold: String(product.lowQuantityThreshold),
    offerActive: product.offerActive,
    offerPaidUnits: product.offerPaidUnits === null ? '' : String(product.offerPaidUnits),
    offerFreeUnits: product.offerFreeUnits === null ? '' : String(product.offerFreeUnits),
    offerStartsAt: toDateTimeLocal(product.offerStartsAt),
    offerEndsAt: toDateTimeLocal(product.offerEndsAt),
    stocks: product.stocks.map((stock) => ({
      key: String(stock.id),
      warehouseId: String(stock.warehouseId),
      quantity: String(stock.quantity),
      reservedQuantity: stock.reservedQuantity,
      isPrimary: stock.isPrimary,
    })),
    imageName: '',
  };
}

function buildProduct(draft: ProductDraft, isCreate: boolean): { readonly input: ProductWriteInput; readonly stocks: readonly ProductStockInput[] } | { readonly errors: Readonly<Record<string, string>> } {
  const errors: Record<string, string> = {};
  if (draft.name.trim().length < 2) errors.name = 'الاسم مطلوب.';
  if (draft.barcode.trim().length < 4) errors.barcode = 'الباركود مطلوب.';
  if (!draft.manufacturerId) errors.manufacturerId = 'اختر شركة مصنّعة.';
  if (draft.activeIngredient.trim().length < 2) errors.activeIngredient = 'المادة الفعالة مطلوبة.';
  const pharmacyUsd = normalizeMoney(draft.pharmacyPriceUsd);
  const consumerUsd = normalizeMoney(draft.consumerPriceUsd);
  const pharmacySyp = normalizeMoney(draft.pharmacyPriceSyp);
  const consumerSyp = normalizeMoney(draft.consumerPriceSyp);
  if (!pharmacyUsd) errors.pharmacyPriceUsd = 'أدخل سعراً أكبر من صفر.';
  if (!consumerUsd) errors.consumerPriceUsd = 'أدخل سعراً أكبر من صفر.';
  if (!draft.calculateSypFromRate && !pharmacySyp) errors.pharmacyPriceSyp = 'سعر الليرة مطلوب.';
  if (!draft.calculateSypFromRate && !consumerSyp) errors.consumerPriceSyp = 'سعر الليرة مطلوب.';
  const minimum = readInteger(draft.minimumOrderQuantity, 1);
  const maximum = readInteger(draft.maximumOrderQuantity, 1);
  const threshold = readInteger(draft.lowQuantityThreshold, 0);
  if (minimum === null) errors.minimumOrderQuantity = 'الحد الأدنى 1 على الأقل.';
  if (maximum === null || (minimum !== null && maximum < minimum)) errors.maximumOrderQuantity = 'الحد الأقصى يجب أن يبلغ الحد الأدنى.';
  if (threshold === null) errors.lowQuantityThreshold = 'أدخل رقماً صحيحاً.';
  const stocks = readStocks(draft.stocks, errors);
  if (draft.offerActive) {
    if (readInteger(draft.offerPaidUnits, 1) === null) errors.offerPaidUnits = 'وحدات مدفوعة مطلوبة.';
    if (readInteger(draft.offerFreeUnits, 1) === null) errors.offerFreeUnits = 'وحدات مجانية مطلوبة.';
    const starts = fromDateTimeLocal(draft.offerStartsAt);
    const ends = fromDateTimeLocal(draft.offerEndsAt);
    if (!starts) errors.offerStartsAt = 'تاريخ البداية مطلوب.';
    if (!ends || (starts && new Date(ends) <= new Date(starts))) errors.offerEndsAt = 'تاريخ النهاية يجب أن يكون بعد البداية.';
  }
  if (Object.keys(errors).length > 0 || !pharmacyUsd || !consumerUsd || minimum === null || maximum === null || threshold === null) {
    return { errors };
  }
  const input: ProductWriteInput = {
    name: draft.name.trim(),
    barcode: draft.barcode.trim(),
    manufacturerId: Number(draft.manufacturerId),
    activeIngredient: draft.activeIngredient.trim(),
    minimumOrderQuantity: minimum,
    maximumOrderQuantity: maximum,
    lowQuantityThreshold: threshold,
    pharmacyPriceUsd: pharmacyUsd,
    consumerPriceUsd: consumerUsd,
    calculateSypFromRate: draft.calculateSypFromRate,
    invoiceCurrency: draft.invoiceCurrency,
    category: draft.category,
    saleUnit: draft.saleUnit,
    offerActive: draft.offerActive,
    ...(isCreate ? {} : { availability: draft.availability, status: draft.status }),
    ...(draft.calculateSypFromRate ? {} : { pharmacyPriceSyp: pharmacySyp ?? undefined, consumerPriceSyp: consumerSyp ?? undefined }),
    ...(draft.offerActive ? {
      offerPaidUnits: readInteger(draft.offerPaidUnits, 1) ?? undefined,
      offerFreeUnits: readInteger(draft.offerFreeUnits, 1) ?? undefined,
      offerStartsAt: fromDateTimeLocal(draft.offerStartsAt) ?? undefined,
      offerEndsAt: fromDateTimeLocal(draft.offerEndsAt) ?? undefined,
    } : {}),
  };
  if (isCreate) {
    return { input: { ...input, stocks }, stocks };
  }
  return { input, stocks };
}

function readStocks(stocks: readonly StockDraft[], errors: Record<string, string>): ProductStockInput[] {
  if (stocks.length === 0) {
    errors.stocks = 'اربط المنتج بمستودع واحد على الأقل.';
    return [];
  }
  const warehouseIds = stocks.map((stock) => stock.warehouseId);
  if (new Set(warehouseIds).size !== warehouseIds.length || warehouseIds.some((id) => id.length === 0)) {
    errors.stocks = 'كل مستودع يُختار مرة واحدة.';
    return [];
  }
  const primaryCount = stocks.filter((stock) => stock.isPrimary).length;
  if (stocks.length > 1 && primaryCount !== 1) {
    errors.stocks = 'عيّن مستودعاً أساسياً واحداً.';
    return [];
  }
  const parsed = stocks.map((stock) => {
    const quantity = readInteger(stock.quantity, 0);
    if (quantity === null || quantity < stock.reservedQuantity) {
      errors.stocks = 'الكمية الفعلية لا يمكن أن تكون أقل من الكمية المحجوزة.';
    }
    return { warehouseId: Number(stock.warehouseId), quantity: quantity ?? 0, isPrimary: stocks.length === 1 ? true : stock.isPrimary };
  });
  return errors.stocks ? [] : parsed;
}

async function saveProduct(productId: number | null, input: ProductWriteInput, stocks: readonly ProductStockInput[]): Promise<ProductRecord> {
  if (productId === null) {
    return createProduct({ ...input, stocks });
  }
  const updated = await updateProduct(productId, input);
  return replaceProductStocks(updated.id, stocks);
}

function manufacturerLabel(manufacturer: ManufacturerRecord): string {
  return manufacturer.status === 'DISABLED' ? `${manufacturer.name} (متوقف)` : manufacturer.name;
}
