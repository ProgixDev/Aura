import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, setAuthToken } from './api';
import { useAdminAuth } from './admin-auth-store';

function memoryStorage() {
  let store = {};
  return {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
  };
}

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('admin auth store', () => {
  beforeEach(() => {
    globalThis.localStorage = memoryStorage();
    setAuthToken(null);
    useAdminAuth.setState({ token: null, admin: null, hasHydrated: false });
  });

  it('setSession stores the admin + token and wires setAuthToken into the api client', async () => {
    useAdminAuth.getState().setSession('tok123', { id: 1, name: 'Boss', email: 'boss@aura.io' });
    expect(useAdminAuth.getState().token).toBe('tok123');
    expect(useAdminAuth.getState().admin).toMatchObject({ name: 'Boss' });

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/admin/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('signOut clears the session and detaches the token from the api client', async () => {
    useAdminAuth.getState().setSession('tok123', { id: 1, name: 'Boss' });
    useAdminAuth.getState().signOut();
    expect(useAdminAuth.getState().token).toBeNull();
    expect(useAdminAuth.getState().admin).toBeNull();

    global.fetch = mockFetch(200, { status: 'success', data: {} });
    await api.get('/admin/profile');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBeUndefined();
  });

  it('persists token + admin to localStorage under aura.admin.session', () => {
    useAdminAuth.getState().setSession('tok456', { id: 2, name: 'Ada' });
    const raw = globalThis.localStorage.getItem('aura.admin.session');
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw);
    expect(parsed.state.token).toBe('tok456');
    expect(parsed.state.admin).toMatchObject({ name: 'Ada' });
  });

  it('skipHydration means state stays empty until rehydrate() is called manually', async () => {
    // Simulate a session already on disk from a prior page load.
    globalThis.localStorage.setItem(
      'aura.admin.session',
      JSON.stringify({ state: { token: 'stored-tok', admin: { id: 3, name: 'Zoé' } }, version: 0 }),
    );
    // A freshly-created store never auto-reads storage — this is what makes it SSR-safe.
    expect(useAdminAuth.getState().token).toBeNull();
    expect(useAdminAuth.getState().hasHydrated).toBe(false);

    await useAdminAuth.persist.rehydrate();

    expect(useAdminAuth.getState().token).toBe('stored-tok');
    expect(useAdminAuth.getState().admin).toMatchObject({ name: 'Zoé' });
    expect(useAdminAuth.getState().hasHydrated).toBe(true);
  });
});
