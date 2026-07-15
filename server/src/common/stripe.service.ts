import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

// Pinned to the Stripe API version this SDK release ships with (confirmed via context7
// against stripe-node's own src/apiVersion.ts) rather than left to drift.
const STRIPE_API_VERSION = '2026-06-24.dahlia';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  createPaymentIntent(amountCents: number, metadata: Record<string, string>) {
    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata,
      // Lets PaymentElement (web) / the Payment Sheet (mobile) offer whatever payment
      // methods are enabled on the Stripe account, without hardcoding to 'card' only.
      automatic_payment_methods: { enabled: true },
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  // ---- Subscriptions (Plan 08e) ----

  createCustomer(email: string, metadata: Record<string, string>) {
    return this.stripe.customers.create({ email, metadata });
  }

  createCheckoutSession(params: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    metadata: Record<string, string>;
  }) {
    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: params.customerId,
      line_items: [{ price: params.priceId, quantity: 1 }],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      metadata: params.metadata,
    });
  }

  /** Schedules cancellation at the end of the current billing period — billing/access stay
   * live until then. Used by the user-initiated cancel action (see SubscriptionsService.cancel). */
  updateSubscriptionCancelAtPeriodEnd(subscriptionId: string) {
    return this.stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
  }

  /** Stops billing immediately — used only when switching between two paid plans (the old
   * subscription must stop before the new Checkout Session's subscription starts, to avoid
   * double-billing). Not used by the user-initiated cancel action. */
  cancelSubscriptionImmediately(subscriptionId: string) {
    return this.stripe.subscriptions.cancel(subscriptionId);
  }
}
