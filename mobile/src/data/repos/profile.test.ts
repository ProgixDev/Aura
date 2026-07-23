import { clientProfileRepo, praticienProfileRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('clientProfileRepo.update', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('PUTs the patch to /client/profile and unwraps the updated client', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { client: { firstname: 'Updated', city: 'Nice' } },
    });
    const res = await clientProfileRepo.update({ firstname: 'Updated', city: 'Nice' });
    expect(res).toEqual({ firstname: 'Updated', city: 'Nice' });
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/client/profile');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ firstname: 'Updated', city: 'Nice' });
  });
});

describe('praticienProfileRepo.update', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('PUTs the patch to /praticien/profile and unwraps the updated praticien', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { praticien: { ville: 'Marseille', tarif: 80 } },
    });
    const res = await praticienProfileRepo.update({ ville: 'Marseille', tarif: 80 });
    expect(res).toEqual({ ville: 'Marseille', tarif: 80 });
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/profile');
    expect(opts.method).toBe('PUT');
    expect(JSON.parse(opts.body)).toEqual({ ville: 'Marseille', tarif: 80 });
  });
});
