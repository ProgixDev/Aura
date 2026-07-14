// Web API client. Wraps fetch, unwraps the backend { status, data, pagination }
// envelope, attaches a bearer token, and throws ApiError on failure.
const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

let authToken = null;
export function setAuthToken(token) { authToken = token; }

export async function apiFetch(path, { method = 'GET', body, token, headers = {} } = {}) {
  const t = token ?? authToken;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
    },
    ...(body !== undefined ? { body: isFormData ? body : JSON.stringify(body) } : {}),
  });

  const text = await res.text();
  let payload = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = text; } }

  if (!res.ok || (payload && payload.status === 'error')) {
    throw new ApiError(payload?.message || `Request failed (${res.status})`, res.status, payload);
  }
  return payload;
}

export const api = {
  get: (p, o) => apiFetch(p, { ...o, method: 'GET' }),
  post: (p, body, o) => apiFetch(p, { ...o, method: 'POST', body }),
  put: (p, body, o) => apiFetch(p, { ...o, method: 'PUT', body }),
  del: (p, o) => apiFetch(p, { ...o, method: 'DELETE' }),
};

// The backend's validation pipe returns { message: 'Erreur de validation',
// errors: { field: [msg, ...] } } for 422s — surface the first field message
// instead of the generic top-level one so the user knows what to fix.
export function errorMessage(err, fallback = 'Une erreur est survenue') {
  if (err instanceof ApiError) {
    const fieldErrors = err.body?.errors;
    if (fieldErrors && typeof fieldErrors === 'object') {
      const first = Object.values(fieldErrors)[0];
      if (Array.isArray(first) && first.length) return first[0];
    }
    return err.message || fallback;
  }
  return err?.message || fallback;
}
