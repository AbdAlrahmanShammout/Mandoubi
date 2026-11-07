import { useState, type FormEvent, type ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { describeAdminError } from '@/api/admin-api-error';
import { useAdmin } from '@/auth/auth-provider';
import { Brand } from '@/components/brand';
import { Field } from '@/components/field';
import { Icon } from '@/components/icon';

const MOBILE_PATTERN = /^\+?[0-9]{8,15}$/;

/**
 * Administrator sign-in for the locked operations direction.
 */
export function SignInPage(): ReactElement {
  const { admin, isReady, signIn } = useAdmin();
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  if (!isReady) {
    return <div className="admin-app" />;
  }
  if (admin) {
    return <Navigate to="/" replace />;
  }
  const submit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }
    if (!MOBILE_PATTERN.test(mobileNumber.trim()) || password.length < 8 || password.length > 128) {
      setErrorMessage('تعذّر تسجيل الدخول. تحقق من بيانات الحساب.');
      return;
    }
    setIsSubmitting(true);
    setErrorMessage('');
    void signIn(mobileNumber.trim(), password)
      .catch((error: unknown) => setErrorMessage(describeAdminError(error)))
      .finally(() => setIsSubmitting(false));
  };
  return (
    <div className="admin-app" dir="rtl">
      <div className="signin-canvas signin-ops">
        <aside className="signin-aside">
          <Brand />
          <div>
            <span className="kicker">نظام الإدارة</span>
            <h4>
              مراجعة الطلبات.
              <br />
              إدارة المخزون.
              <br />
              <em>بوضوح.</em>
            </h4>
          </div>
          <p>منصة واحدة لتنسيق حركة الدواء من المستودع إلى الصيدلية.</p>
        </aside>
        <div className="signin-form-wrap">
          <form className="signin-form" onSubmit={submit}>
            <div className="form-intro">
              <span className="mini-label">دخول الإدارة</span>
              <h4>أهلاً بعودتك</h4>
              <p>أدخل بيانات الحساب للمتابعة إلى لوحة الإدارة.</p>
            </div>
            <Field label="رقم الموبايل" required>
              <div className="input-with-icon">
                <Icon name="phone" />
                <input value={mobileNumber} onChange={(event) => setMobileNumber(event.target.value)} inputMode="tel" autoComplete="username" dir="ltr" />
                <span />
              </div>
            </Field>
            <Field label="كلمة المرور" required>
              <div className="input-with-icon">
                <Icon name="lock" />
                <input
                  type={isPasswordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
                <button type="button" className="icon-button" aria-label={isPasswordVisible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'} onClick={() => setIsPasswordVisible((current) => !current)}>
                  <Icon name="eye" />
                </button>
              </div>
            </Field>
            {errorMessage && <p className="signin-error">{errorMessage}</p>}
            <button type="submit" className={`primary full ${isSubmitting ? 'ds-loading' : ''}`} disabled={isSubmitting}>
              {isSubmitting && <i />} دخول إلى لوحة الإدارة <Icon name="arrow" />
            </button>
            <p className="secure-note">
              <Icon name="lock" size={13} /> اتصال آمن · كلمة المرور لا تُعرض أو تُحفظ
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
