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
