import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { RendezVousService } from './rendez-vous.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { StripeService } from '../common/stripe.service';

// Event types this plan's SubscriptionsService owns — everything else (Plan 05's
// payment_intent.* events) keeps routing to RendezVousService exactly as it did before.
const SUBSCRIPTION_EVENT_TYPES = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_failed',
]);

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly rendezVousService: RendezVousService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly stripeService: StripeService,
  ) {}

  @HttpCode(200)
  @Post()
  async handle(@Req() req: RawBodyRequest<Request>, @Headers('stripe-signature') signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripeService.constructWebhookEvent(
        req.rawBody as Buffer,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET ?? '',
      );
    } catch {
      throw new BadRequestException({ status: 'error', message: 'Signature Stripe invalide' });
    }
    if (SUBSCRIPTION_EVENT_TYPES.has(event.type)) {
      return this.subscriptionsService.handleStripeWebhookEvent(event);
    }
    return this.rendezVousService.handleStripeWebhookEvent(event);
  }
}
