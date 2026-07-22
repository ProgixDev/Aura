import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Praticien } from '../database/entities/praticien.entity';
import { StripeService } from '../common/stripe.service';
import { success } from '../common/envelope';

// Stripe-hosted onboarding is a browser flow; there is no praticien-facing web surface to
// redirect back to, so both the refresh and return URLs default to the mobile app's own
// deep-link scheme. Overridable via env in case a given Stripe account's allow-list needs a
// real https:// URL instead.
const CONNECT_RETURN_URL = process.env.STRIPE_CONNECT_RETURN_URL || 'guerienergies://dashboard';

@Injectable()
export class StripeConnectService {
  private readonly logger = new Logger(StripeConnectService.name);

  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly stripeService: StripeService,
  ) {}

  async onboard(praticien: Praticien) {
    let accountId = praticien.stripe_account_id;
    if (!accountId) {
      const account = await this.stripeService.createConnectAccount(praticien.email);
      accountId = account.id;
      await this.praticiens.update(praticien.id, { stripe_account_id: accountId });
    }
    const link = await this.stripeService.createAccountLink(accountId, CONNECT_RETURN_URL, CONNECT_RETURN_URL);
    return success({ url: link.url });
  }

  status(praticien: Praticien) {
    return success({
      stripe_account_id: praticien.stripe_account_id,
      stripe_payouts_enabled: praticien.stripe_payouts_enabled,
    });
  }

  async adminStatus() {
    const total_praticiens = await this.praticiens.count();
    const connected_praticiens = await this.praticiens.count({ where: { stripe_payouts_enabled: true } });
    return success({ total_praticiens, connected_praticiens });
  }

  async handleAccountUpdated(event: Stripe.Event) {
    const account = event.data.object as Stripe.Account;
    const praticien = await this.praticiens.findOneBy({ stripe_account_id: account.id });
    if (!praticien) return success(undefined, 'ok');

    // Mirrors Stripe's real-time state in both directions (not a one-way latch): if Stripe
    // later restricts an account that was previously payout-enabled, this plan's copy of
    // that flag must follow suit, since RendezVousService.create() uses it to decide whether
    // to route money to this account.
    const payoutsEnabled = Boolean(account.charges_enabled && account.payouts_enabled);
    if (praticien.stripe_payouts_enabled !== payoutsEnabled) {
      await this.praticiens.update(praticien.id, { stripe_payouts_enabled: payoutsEnabled });
      this.logger.log(`praticien ${praticien.id} stripe_payouts_enabled -> ${payoutsEnabled}`);
    }
    return success(undefined, 'ok');
  }
}
