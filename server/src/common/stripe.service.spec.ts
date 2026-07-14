import Stripe from 'stripe';
import { StripeService } from './stripe.service';

describe('StripeService', () => {
  const secret = 'whsec_test_secret';
  let service: StripeService;

  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
    service = new StripeService();
  });

  it('constructWebhookEvent parses a correctly signed payload', () => {
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'payment_intent.succeeded' });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = service.constructWebhookEvent(Buffer.from(payload), header, secret);
    expect(event.id).toBe('evt_test');
    expect(event.type).toBe('payment_intent.succeeded');
  });

  it('constructWebhookEvent throws when the payload does not match the signature', () => {
    const payload = JSON.stringify({ id: 'evt_test', object: 'event', type: 'payment_intent.succeeded' });
    const header = Stripe.webhooks.generateTestHeaderString({ payload, secret });
    expect(() =>
      service.constructWebhookEvent(Buffer.from(payload + 'tampered'), header, secret),
    ).toThrow();
  });
});
