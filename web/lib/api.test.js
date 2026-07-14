import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api, ApiError, setAuthToken, apiFetchBlob } from './api';

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

  it('sends FormData bodies as-is, without a JSON content-type header', async () => {
    global.fetch = mockFetch(201, { status: 'success', data: { id: 1 } });
    const fd = new FormData();
    fd.append('motif', 'Test');
    await api.post('/remboursements/client', fd);
    const [, opts] = global.fetch.mock.calls[0];
    expect(opts.body).toBe(fd);
    expect(opts.headers['Content-Type']).toBeUndefined();
  });

  it('apiFetchBlob attaches the bearer token and resolves with a Blob on success', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    global.fetch = vi.fn().mockResolvedValue({ ok: true, status: 200, blob: async () => blob });
    setAuthToken('tok123');
    const res = await apiFetchBlob('/v1/admin/praticiens/verification/documents/1/file');
    expect(res).toBe(blob);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:8000/api/v1/admin/praticiens/verification/documents/1/file');
    expect(opts.headers.Authorization).toBe('Bearer tok123');
  });

  it('apiFetchBlob throws ApiError on a non-2xx response instead of returning a Blob', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false, status: 404,
      text: async () => JSON.stringify({ status: 'error', message: 'Document non trouvé' }),
    });
    await expect(apiFetchBlob('/v1/admin/praticiens/verification/documents/999/file'))
      .rejects.toBeInstanceOf(ApiError);
  });
});
