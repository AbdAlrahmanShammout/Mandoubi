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
  if (error.message.trim().length > 0 && error.statusCode < 500) {
    return error.message;
  }
  return 'تعذّرت العملية. أعد المحاولة.';
}
