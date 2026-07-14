import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, setAuthToken } from './api';
import { useAuthStore } from './auth-store';

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

function mockLocalStorage() {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
}

describe('web auth store', () => {
  beforeEach(() => {
    global.localStorage = mockLocalStorage();
    setAuthToken(null);
    useAuthStore.setState({ token: null, client: null, hasHydrated: false });
  });

  it('setSession stores the token/client and pushes the token into the api client', async () => {
    const client = { id: 1, firstname: 'Sarah' };
    useAuthStore.getState().setSession('tok123', client);

    expect(useAuthStore.getState().token).toBe('tok123');
    expect(useAuthStore.getState().client).toEqual(client);

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/client/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('signOut clears the token/client and the api client bearer token', async () => {
    useAuthStore.getState().setSession('tok123', { id: 1 });
    useAuthStore.getState().signOut();

    expect(useAuthStore.getState().token).toBeNull();
    expect(useAuthStore.getState().client).toBeNull();

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/client/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });
});
