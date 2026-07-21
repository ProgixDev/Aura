// Mobile API client. Mirrors web/lib/api.js: wraps fetch, unwraps the backend
// { status, data, pagination } envelope, attaches a bearer token, throws ApiError.
const BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let authToken: string | null = null;
export const setAuthToken = (token: string | null) => { authToken = token; };

// Called when an *authenticated* request comes back 401 (expired/invalid JWT),
// so the app can sign the user out and send them to login instead of surfacing
// a raw "Token invalide ou expiré" wherever the call happened to fire. Set by
// the root layout; no-op until then.
let onUnauthorized: (() => void) | null = null;
export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiFetch<T = any>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, token, headers = {} } = opts;
  const t = token ?? authToken;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: (isFormData ? body : JSON.stringify(body)) as BodyInit } : {}),
  });

  const text = await res.text();
  let payload: any = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || payload?.status === 'error') {
    // Only fire on requests that actually carried a token — a 401 from login
    // itself (wrong credentials) must not trigger a sign-out/redirect loop.
    if (res.status === 401 && t) onUnauthorized?.();
    throw new ApiError(payload?.message ?? `Request failed (${res.status})`, res.status, payload);
  }
  return payload as T;
}

export const api = {
  get: <T = any>(p: string, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'GET' }),
  post: <T = any>(p: string, body?: unknown, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'POST', body }),
  put: <T = any>(p: string, body?: unknown, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'PUT', body }),
  del: <T = any>(p: string, o?: ApiOptions) => apiFetch<T>(p, { ...o, method: 'DELETE' }),
};

// The backend's validation pipe returns { message: 'Erreur de validation',
// errors: { field: [msg, ...] } } for 422s — surface the first field message
// instead of the generic top-level one so the user knows what to fix.
export function errorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  if (err instanceof ApiError) {
    const fieldErrors = (err.body as { errors?: Record<string, string[]> } | null)?.errors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors)[0];
      if (Array.isArray(first) && first.length) return first[0];
    }
    return err.message || fallback;
  }
  return fallback;
}
