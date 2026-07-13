import { api, ApiError, setAuthToken } from './client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('mobile api client', () => {
  beforeEach(() => setAuthToken(null));

  it('unwraps the success envelope', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: [{ id: '1' }] });
    const res = await api.get<{ data: { id: string }[] }>('/praticiens');
    expect(res.data).toEqual([{ id: '1' }]);
  });

  it('attaches the bearer token', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: {} });
    setAuthToken('tok');
    await api.get('/x');
    const opts = (global.fetch as jest.Mock).mock.calls[0][1];
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  it('throws ApiError on an error status', async () => {
    (global as any).fetch = mockFetch(500, { status: 'error', message: 'boom' });
    await expect(api.get('/x')).rejects.toBeInstanceOf(ApiError);
  });
});
