const DEFAULT_API_BASE_URL = 'http://114.116.135.188:9093';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

function isLoopbackApi(value: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return ['127.0.0.1', 'localhost', '0.0.0.0'].includes(url.hostname);
  } catch {
    return false;
  }
}

const configuredApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL);
const useSameOriginApi = import.meta.env.VITE_API_SAME_ORIGIN === 'true';
const fallbackToSameOriginInProd = import.meta.env.PROD && isLoopbackApi(configuredApiBaseUrl);

// In local Vite development we route /api through the dev proxy to avoid browser CORS failures.
export const API_BASE_URL = import.meta.env.DEV || useSameOriginApi || fallbackToSameOriginInProd ? '' : configuredApiBaseUrl;
export const CONFIGURED_API_BASE_URL = configuredApiBaseUrl;
