const SESSION_STORAGE_KEY = 'mandoubi.admin.session';

interface StoredSession {
  readonly accessToken: string;
  readonly expiresAt: number | null;
}

/**
 * Reads the administrator access token when it has not expired locally.
 */
export function readAccessToken(): string | null {
  const session = readSession();
  if (!session) {
    return null;
  }
  if (session.expiresAt !== null && session.expiresAt <= Date.now()) {
    clearSession();
    return null;
  }
  return session.accessToken;
}

/**
 * Stores the bearer token returned by admin sign-in.
 */
export function saveSession(accessToken: string, expiresIn: string): void {
  const lifetime = readLifetimeMs(expiresIn);
  const session: StoredSession = {
    accessToken,
    expiresAt: lifetime === null ? null : Date.now() + lifetime,
  };
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
}

/**
 * Drops the stored administrator session.
 */
export function clearSession(): void {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
}

function readSession(): StoredSession | null {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed)) {
      clearSession();
      return null;
    }
    return parsed;
  } catch {
    clearSession();
    return null;
  }
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const session = value as StoredSession;
  return typeof session.accessToken === 'string' && (session.expiresAt === null || typeof session.expiresAt === 'number');
}

function readLifetimeMs(expiresIn: string): number | null {
  const match = /^(\d+)(s|m|h|d)$/.exec(expiresIn.trim());
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return amount * (multipliers[unit] ?? 0);
}
