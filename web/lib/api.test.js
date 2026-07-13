import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError, setAuthToken } from './api';

function mockFetch(status, body) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('web api client', () => {
  beforeEach(() => { setAuthToken(null); });

  it('GET builds the URL and unwraps the success envelope', async () => {
    global.fetch = mockFetch(200, { status: 'success', data: [{ id: 1 }] });
    const res = await api.get('/praticiens');
    expect(res.data).toEqual([{ id: 1 }]);
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:8000/api/praticiens',
      expect.objectContaining({ method: 'GET' }),
    );
  });

  it('attaches the bearer token when set', async () => {
    global.fetch = mockFetch(200, { status: 'success', data: {} });
    setAuthToken('tok123');
    await api.get('/compte');
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('throws ApiError on a non-2xx response', async () => {
    global.fetch = mockFetch(404, { status: 'error', message: 'Not found' });
    await expect(api.get('/nope')).rejects.toBeInstanceOf(ApiError);
  });
});
