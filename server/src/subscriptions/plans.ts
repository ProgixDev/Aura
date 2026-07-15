// Canonical 3-tier plan pricing (P8-3) — mirrors web/lib/data/content.js's `plans` array
// exactly. Kept in sync by hand: this codebase has no shared package between server/ and
// web/, matching how mobile's own copy of this data (Task 10) is also a hand-kept mirror.
export const PLAN_PRICES: Record<'essentiel' | 'pro' | 'premium', number> = {
  essentiel: 0,
  pro: 29,
  premium: 59,
};

export function priceIdForPlan(plan: 'pro' | 'premium'): string {
  const envVar = plan === 'pro' ? 'STRIPE_PRICE_ID_PRO' : 'STRIPE_PRICE_ID_PREMIUM';
  const id = process.env[envVar];
  if (!id) {
    throw new Error(
      `Missing ${envVar} — set it in server/.env to a real Stripe test-mode Price id ` +
      `before creating a Checkout Session for the "${plan}" plan (see this plan's Prerequisites section).`,
    );
  }
  return id;
}
