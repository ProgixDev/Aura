import { subscriptionRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('subscriptionRepo', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('current fetches /praticien/subscription and unwraps the data', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { id: 1, plan: 'essentiel', statut: 'active' },
    });
    const res = await subscriptionRepo.current();
    expect(res.plan).toBe('essentiel');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/subscription');
  });

  it('checkout posts { plan } to /praticien/subscription/checkout and unwraps the url', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { url: 'https://checkout.stripe.com/test_abc' },
    });
    const res = await subscriptionRepo.checkout('pro');
    expect(res.url).toBe('https://checkout.stripe.com/test_abc');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/subscription/checkout');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ plan: 'pro' });
  });

  it('cancel posts to /praticien/subscription/cancel and unwraps the updated subscription', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { id: 1, plan: 'pro', statut: 'active' },
    });
    const res = await subscriptionRepo.cancel();
    expect(res.statut).toBe('active');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/subscription/cancel');
    expect(opts.method).toBe('POST');
  });
});
