import type { FieldError } from '@/api/api-types';

/**
 * Failure returned by the admin audience API.
 */
export class AdminApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly fieldErrors: readonly FieldError[];
  constructor(statusCode: number, code: string, message: string, fieldErrors: readonly FieldError[] = []) {
    super(message);
    this.name = 'AdminApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/**
 * Arabic message safe to show for a failed admin request.
 */
export function describeAdminError(error: unknown): string {
  if (!(error instanceof AdminApiError)) {
    return 'تعذّر الاتصال بالخادم. تحقق من تشغيل واجهة الإدارة ثم أعد المحاولة.';
  }
  if (error.statusCode === 0 || error.statusCode >= 500) {
    return 'تعذّر الاتصال بالخادم. تحقق من تشغيل واجهة الإدارة ثم أعد المحاولة.';
  }
  if (error.statusCode === 401) {
    return 'تعذّر تسجيل الدخول. تحقق من بيانات الحساب.';
  }
  if (error.statusCode === 404) {
    return 'السجل غير موجود.';
  }
  if (error.statusCode === 409) {
    return 'هذه القيمة مستخدمة مسبقاً.';
  }
  if (error.statusCode === 422) {
    return 'راجع الحقول المطلوبة. بعض القيم غير مقبولة.';
  }
  if (error.code === 'MANUFACTURER_INACTIVE') {
    return 'الشركة المصنعة متوقفة ولا يمكن اختيارها.';
  }
  if (error.code === 'RESERVED_STOCK_LOCKED') {
    return 'الكمية الفعلية لا يمكن أن تكون أقل من الكمية المحجوزة.';
  }
  if (error.code === 'PRIMARY_WAREHOUSE_REQUIRED') {
    return 'يجب تعيين مستودع أساسي واحد بالضبط.';
  }
  if (error.code === 'WAREHOUSE_LINK_DUPLICATED') {
    return 'لا يمكن ربط المنتج بالمستودع نفسه مرتين.';
  }
  if (error.code === 'ORDER_LIMIT_INVALID') {
    return 'الحد الأقصى للطلب يجب أن يكون أكبر من الحد الأدنى أو مساوياً له.';
  }
  if (error.code === 'OFFER_INVALID') {
    return 'العرض الفعّال يحتاج وحدات مدفوعة ومجانية وتاريخ نهاية بعد البداية.';
  }
  if (error.code === 'SYP_PRICE_REQUIRED' || error.code === 'USD_PRICE_REQUIRED') {
    return 'أسعار الدولار والليرة مطلوبة عندما يكون حساب سعر الصرف متوقفاً.';
  }
  if (error.code === 'INSUFFICIENT_STOCK') {
    return 'الكمية المتاحة في المستودع المسجّل على الفاتورة لا تكفي للموافقة.';
  }
  if (error.code === 'REJECTION_REASON_INACTIVE') {
    return 'سبب الرفض المختار متوقف. اختر سبباً فعّالاً أو ارفض بدون سبب.';
  }
  if (error.code === 'DRIVER_INACTIVE') {
    return 'حساب السائق متوقف ولا يمكن إسناد فاتورة إليه.';
  }
  if (error.code === 'INVOICE_NOT_APPROVED') {
    return 'لا يمكن إسناد إلا فاتورة موافق عليها أو فاتورة عادت للمستودع.';
  }
  if (error.code === 'INVOICE_ALREADY_ASSIGNED') {
    return 'هذه الفاتورة مسندة لسائق مسبقاً.';
  }
  if (error.code === 'RETURN_NOT_ALLOWED') {
    return 'لا يمكن إرجاع هذه الفاتورة. الإرجاع مسموح فقط إذا لم تُسلَّم أو سُلّمت دون تحصيل.';
  }
  if (error.code === 'RETURN_ALREADY_RECORDED') {
    return 'أُرجعت هذه الفاتورة إلى المستودع مسبقاً.';
  }
  if (error.code === 'RECEIPT_AMOUNT_MISMATCH') {
    return 'مبلغ الإيصال يجب أن يساوي مجموع الفواتير المختارة كاملاً.';
  }
  if (error.code === 'INVOICE_NOT_DUE' || error.code === 'INVOICE_ALREADY_PAID') {
    return 'الإيصال يغطي فواتير سُلّمت ولم تُحصَّل بعد فقط.';
  }
  if (error.code === 'INVOICE_CURRENCY_MISMATCH') {
    return 'كل الفواتير في الإيصال يجب أن تكون بعملة واحدة.';
  }
  if (error.code === 'INVOICE_PHARMACY_MISMATCH') {
    return 'إحدى الفواتير لا تتبع هذه الصيدلية.';
  }
  if (error.code === 'SETTLEMENT_AMOUNT_MISMATCH') {
    return 'مبلغ التسليم يجب أن يساوي التحصيلات المختارة كاملة.';
  }
  if (error.code === 'SETTLEMENT_PAYMENT_MISMATCH') {
    return 'التسليم يشمل تحصيلات هذا السائق وبنفس العملة فقط.';
  }
  if (error.code === 'COLLECTION_ALREADY_SETTLED') {
    return 'إحدى التحصيلات سُلّمت للإدارة مسبقاً.';
  }
  if (error.code === 'REPORT_PERIOD_INVALID') {
    return 'تاريخ البداية يجب أن يكون قبل تاريخ النهاية أو مساوياً له.';
  }
  if (error.message.trim().length > 0 && error.statusCode < 500) {
    return error.message;
  }
  return 'تعذّرت العملية. أعد المحاولة.';
}
