import type { ReactElement, ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAdmin } from '@/auth/auth-provider';

/**
 * Sends an anonymous visitor to sign-in and keeps a signed-in administrator inside the shell.
 */
export function RequireSession({ children }: { readonly children: ReactNode }): ReactElement {
  const { admin, isReady } = useAdmin();
  if (!isReady) {
    return <div className="admin-app" />;
  }
  if (!admin) {
    return <Navigate to="/sign-in" replace />;
  }
  return <>{children}</>;
}
