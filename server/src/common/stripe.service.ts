import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

// Pinned to the Stripe API version this SDK release ships with (confirmed via context7
// against stripe-node's own src/apiVersion.ts) rather than left to drift.
const STRIPE_API_VERSION = '2026-06-24.dahlia';

export interface PaymentIntentConnectFields {
  applicationFeeAmount: number;
  destination: string;
}

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;

  constructor() {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
      apiVersion: STRIPE_API_VERSION,
    });
  }

  createPaymentIntent(
    amountCents: number,
    metadata: Record<string, string>,
    connect?: PaymentIntentConnectFields,
  ) {
    return this.stripe.paymentIntents.create({
      amount: amountCents,
      currency: 'eur',
      metadata,
      // Lets PaymentElement (web) / the Payment Sheet (mobile) offer whatever payment
      // methods are enabled on the Stripe account, without hardcoding to 'card' only.
      automatic_payment_methods: { enabled: true },
      // Standard Stripe Connect "destination charges" pattern: the platform's own Stripe
      // account is the merchant of record, application_fee_amount is what the platform
      // keeps, and the rest is transferred automatically to the connected account once the
      // charge settles. Only attached when the caller resolved a Connect-eligible praticien
      // (see RendezVousService.create()) — omitted entirely otherwise, so this stays
      // byte-for-byte identical to the original call for every existing test/caller that
      // doesn't pass `connect`.
      ...(connect
        ? {
            application_fee_amount: connect.applicationFeeAmount,
            transfer_data: { destination: connect.destination },
          }
        : {}),
    });
  }

  constructWebhookEvent(rawBody: Buffer, signature: string, secret: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(rawBody, signature, secret);
  }

  // ---- Connect (Plan 08f) ----

  createConnectAccount(email: string) {
    return this.stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });
  }

  createAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    return this.stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  // ---- Subscriptions (Plan 08e) ----

  createCustomer(email: string, metadata: Record<string, string>) {
    return this.stripe.customers.create({ email, metadata });
  }

  /** Looks up a monthly recurring Price by its stable `lookupKey`, creating the backing
   * Product + Price on first call if none exists yet. Removes the need to hand-create
   * subscription tiers in the Stripe dashboard and paste price ids into env — this is the
   * one-time provisioning step instead, self-healing across environments/dashboard resets
   * since it's driven by Stripe's own state, not a local cache. */
  async findOrCreatePrice(params: {
    lookupKey: string;
    productName: string;
    unitAmountCents: number;
  }): Promise<string> {
    const existing = await this.stripe.prices.list({ lookup_keys: [params.lookupKey], active: true, limit: 1 });
    if (existing.data[0]) return existing.data[0].id;

    const product = await this.stripe.products.create({ name: params.productName });
    const price = await this.stripe.prices.create({
      product: product.id,
      unit_amount: params.unitAmountCents,
      currency: 'eur',
      recurring: { interval: 'month' },
      lookup_key: params.lookupKey,
    });
    return price.id;
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
