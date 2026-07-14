import { rendezVousRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('rendezVousRepo', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('create posts to /rendez-vous and unwraps { rendez_vous, client_secret }', async () => {
    const payload = {
      status: 'success',
      data: { rendez_vous: { id: 1, statut: 'en_attente' }, client_secret: 'secret_abc' },
    };
    (global as any).fetch = mockFetch(201, payload);
    const res = await rendezVousRepo.create({
      praticien_id: 1, date_heure: '2026-08-01T10:00:00', mode: 'présentiel',
    });
    expect(res.client_secret).toBe('secret_abc');
    expect(res.rendez_vous.id).toBe(1);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/rendez-vous');
    expect(opts.method).toBe('POST');
  });

  it('byId fetches /rendez-vous/client/:id and unwraps the rendez_vous', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: { id: 5, statut: 'confirme' } });
    const res = await rendezVousRepo.byId(5);
    expect(res.id).toBe(5);
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/rendez-vous/client/5');
  });

  it('cancel posts to /rendez-vous/client/:id/cancel', async () => {
    (global as any).fetch = mockFetch(200, { status: 'success', data: { id: 5, statut: 'annule' } });
    await rendezVousRepo.cancel(5);
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/rendez-vous/client/5/cancel');
    expect(opts.method).toBe('POST');
  });
});
