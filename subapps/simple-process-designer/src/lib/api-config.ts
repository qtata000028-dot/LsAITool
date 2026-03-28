const DEFAULT_DEV_API_BASE_URL = 'http://127.0.0.1:8080';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function resolveEmbeddedHostOrigin() {
  if (typeof document === 'undefined') {
    return '';
  }

  const referrer = document.referrer?.trim();
  if (!referrer) {
    return '';
  }

  try {
    const referrerUrl = new URL(referrer);
    const currentOrigin = typeof window === 'undefined' ? '' : window.location.origin;
    return referrerUrl.origin && referrerUrl.origin !== currentOrigin
      ? trimTrailingSlash(referrerUrl.origin)
      : '';
  } catch {
    return '';
  }
}

const rawConfiguredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || '';
const hasExplicitApiBaseUrl = rawConfiguredApiBaseUrl.length > 0;
const configuredApiBaseUrl = trimTrailingSlash(
  rawConfiguredApiBaseUrl || (import.meta.env.DEV ? DEFAULT_DEV_API_BASE_URL : ''),
);
const embeddedHostOrigin = resolveEmbeddedHostOrigin();
const preferEmbeddedHostProxy = import.meta.env.VITE_SIMPLE_DESIGNER_USE_PARENT_PROXY === 'true';
const useSameOriginApi = import.meta.env.VITE_API_SAME_ORIGIN === 'true';
const shouldUseSameOriginApi = useSameOriginApi || (import.meta.env.PROD && !hasExplicitApiBaseUrl);

export const API_BASE_URL = shouldUseSameOriginApi
  ? ''
  : hasExplicitApiBaseUrl
    ? configuredApiBaseUrl
    : preferEmbeddedHostProxy && embeddedHostOrigin
      ? embeddedHostOrigin
      : import.meta.env.DEV
        ? ''
        : configuredApiBaseUrl;
export const CONFIGURED_API_BASE_URL = configuredApiBaseUrl;
export const EMBEDDED_HOST_ORIGIN = embeddedHostOrigin;
