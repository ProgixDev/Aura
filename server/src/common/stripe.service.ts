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
}
