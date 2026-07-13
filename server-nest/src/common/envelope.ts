export function success(data?: unknown, message?: string, extra?: Record<string, unknown>) {
  return {
    status: 'success',
    ...(message !== undefined ? { message } : {}),
    ...(data !== undefined ? { data } : {}),
    ...(extra ?? {}),
  };
}

export function fail(message: string, extra?: Record<string, unknown>) {
  return { status: 'error', message, ...(extra ?? {}) };
}
