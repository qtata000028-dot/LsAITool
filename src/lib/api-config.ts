const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

const configuredApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL);
const useSameOriginApi = import.meta.env.VITE_API_SAME_ORIGIN === 'true';

// Default to the configured backend directly. Only use same-origin proxying when explicitly enabled.
export const API_BASE_URL = useSameOriginApi ? '' : configuredApiBaseUrl;
export const CONFIGURED_API_BASE_URL = configuredApiBaseUrl;
