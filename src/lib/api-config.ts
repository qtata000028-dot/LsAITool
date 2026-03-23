const DEFAULT_API_BASE_URL = 'http://127.0.0.1:8080';

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, '');
}

const configuredApiBaseUrl = trimTrailingSlash(import.meta.env.VITE_API_BASE_URL?.trim() || DEFAULT_API_BASE_URL);

// In local Vite development we route /api through the dev proxy to avoid browser CORS failures.
export const API_BASE_URL = import.meta.env.DEV ? '' : configuredApiBaseUrl;
export const CONFIGURED_API_BASE_URL = configuredApiBaseUrl;
