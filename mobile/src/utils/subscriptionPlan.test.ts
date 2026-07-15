import { effectivePlan } from './subscriptionPlan';

describe('effectivePlan', () => {
  it('returns the stored plan when the subscription is active', () => {
    expect(effectivePlan({ plan: 'pro', statut: 'active' })).toBe('pro');
  });

  it('returns the stored plan when trialing', () => {
    expect(effectivePlan({ plan: 'premium', statut: 'trialing' })).toBe('premium');
  });

  it('returns the stored plan when past_due — access continues while Stripe retries billing', () => {
    expect(effectivePlan({ plan: 'pro', statut: 'past_due' })).toBe('pro');
  });

  it('returns essentiel when canceled, even though the stored plan is still the last paid tier', () => {
    expect(effectivePlan({ plan: 'premium', statut: 'canceled' })).toBe('essentiel');
  });
});
