// Canonical 3-tier plan pricing (P8-3) — mirrors web/lib/data/content.js's `plans` array
// exactly. Kept in sync by hand: this codebase has no shared package between server/ and
// web/, matching how mobile's own copy of this data (Task 10) is also a hand-kept mirror.
export const PLAN_PRICES: Record<'essentiel' | 'pro' | 'premium', number> = {
  essentiel: 0,
  pro: 29,
  premium: 59,
};

// Stable identifiers StripeService.findOrCreatePrice() looks up (or provisions on first
// use) against the Stripe account — no dashboard setup or env-configured price id needed.
export const PLAN_STRIPE_INFO: Record<'pro' | 'premium', { lookupKey: string; productName: string }> = {
  pro: { lookupKey: 'aura_plan_pro_monthly', productName: 'Aura — Formule Pro' },
  premium: { lookupKey: 'aura_plan_premium_monthly', productName: 'Aura — Formule Premium' },
};
