import { stripeConnectRepo } from './index';
import { setAuthToken } from '../api/client';

function mockFetch(status: number, body?: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  });
}

describe('stripeConnectRepo', () => {
  beforeEach(() => setAuthToken('test-token'));

  it('status fetches /praticien/stripe/connect/status and unwraps the data', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success',
      data: { stripe_account_id: 'acct_123', stripe_payouts_enabled: true },
    });
    const res = await stripeConnectRepo.status();
    expect(res.stripe_payouts_enabled).toBe(true);
    expect(res.stripe_account_id).toBe('acct_123');
    const [url] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/stripe/connect/status');
  });

  it('onboard posts to /praticien/stripe/connect/onboard and unwraps the url', async () => {
    (global as any).fetch = mockFetch(200, {
      status: 'success', data: { url: 'https://connect.stripe.com/setup/test' },
    });
    const res = await stripeConnectRepo.onboard();
    expect(res.url).toBe('https://connect.stripe.com/setup/test');
    const [url, opts] = (global.fetch as jest.Mock).mock.calls[0];
    expect(url).toContain('/praticien/stripe/connect/onboard');
    expect(opts.method).toBe('POST');
  });
});
