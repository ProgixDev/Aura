import type { SubscriptionPlan, SubscriptionStatut } from '../data/types';

export interface SubscriptionLike {
  plan: SubscriptionPlan;
  statut: SubscriptionStatut;
}

/**
 * The plan a praticien actually has access to right now. A 'canceled' subscription has
 * lost paid-tier access even though `plan` on the server still records the last paid tier
 * they were on (kept there for admin history). 'past_due' still grants access — Stripe
 * keeps billing/retrying before a hard cancellation.
 */
export function effectivePlan(sub: SubscriptionLike): SubscriptionPlan {
  return sub.statut === 'canceled' ? 'essentiel' : sub.plan;
}
