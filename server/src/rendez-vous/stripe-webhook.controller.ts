import { BadRequestException, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import Stripe from 'stripe';
import { RendezVousService } from './rendez-vous.service';
import { StripeService } from '../common/stripe.service';

@Controller('webhooks/stripe')
export class StripeWebhookController {
  constructor(
    private readonly rendezVousService: RendezVousService,
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
    return this.rendezVousService.handleStripeWebhookEvent(event);
  }
}
