import { createContext, useContext, useEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import type { AdminUser } from '@/api/api-types';
import { getCurrentAdmin, setUnauthorizedHandler, signInAdmin, signOutAdmin } from '@/api/admin-api-client';
import { clearSession, readAccessToken, saveSession } from '@/api/session-store';

interface AuthContextValue {
  readonly admin: AdminUser | null;
  readonly isReady: boolean;
  readonly signIn: (mobileNumber: string, password: string) => Promise<void>;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Signed-in administrator, or null while the session is still loading or absent.
 */
export function useAdmin(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('Admin session is unavailable');
  }
  return context;
}

/**
 * Loads the current administrator from the stored admin-audience token.
 */
export function AuthProvider({ children }: { readonly children: ReactNode }): ReactElement {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setAdmin(null);
      if (window.location.pathname !== '/sign-in') {
        window.history.replaceState(null, '', '/sign-in');
        window.location.assign('/sign-in');
      }
    });
    const accessToken = readAccessToken();
    if (!accessToken) {
      setIsReady(true);
      return;
    }
    void getCurrentAdmin()
      .then((current) => setAdmin(current))
      .catch(() => {
        clearSession();
        setAdmin(null);
      })
      .finally(() => setIsReady(true));
  }, []);
  const value = useMemo<AuthContextValue>(
    () => ({
      admin,
      isReady,
      signIn: async (mobileNumber: string, password: string): Promise<void> => {
        const session = await signInAdmin(mobileNumber, password);
        saveSession(session.accessToken, session.expiresIn);
        const current = await getCurrentAdmin();
        setAdmin(current);
      },
      signOut: async (): Promise<void> => {
        await signOutAdmin();
        setAdmin(null);
      },
    }),
    [admin, isReady],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
