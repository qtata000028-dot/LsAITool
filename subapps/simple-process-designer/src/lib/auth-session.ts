import type { AuthSession } from './backend-auth';

const AUTH_STORAGE_KEY = 'ls-ai-tool-auth-session';

function readSessionFrom(storage: Storage | null) {
  if (!storage) {
    return null;
  }

  const rawValue = storage.getItem(AUTH_STORAGE_KEY);
  if (!rawValue) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as AuthSession;
  } catch {
    storage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function getStoredAuthSession() {
  if (typeof window === 'undefined') {
    return null;
  }

  return readSessionFrom(window.sessionStorage) ?? readSessionFrom(window.localStorage);
}

export function persistHydratedAuthSession(session: AuthSession | null | undefined) {
  if (typeof window === 'undefined') {
    return;
  }

  if (!session) {
    window.sessionStorage.removeItem(AUTH_STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function getAccessToken() {
  return getStoredAuthSession()?.accessToken ?? null;
}
