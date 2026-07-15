import { Injectable, Logger, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import Stripe from 'stripe';
import { Subscription } from '../database/entities/subscription.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { StripeService } from '../common/stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { priceIdForPlan, PLAN_PRICES } from './plans';
import { parsePagination, paginateQb } from '../common/pagination';

// Stripe-hosted Checkout is a browser flow; there is no praticien-facing web surface to
// redirect back to (same finding Plan 08f's Connect onboarding made for its own return URL
// — see that plan's Design notes), so both URLs default to the mobile app's own deep-link
// scheme. Overridable via env in case a given Stripe account's allow-list needs a real
// https:// URL instead.
const SUCCESS_URL = process.env.STRIPE_SUBSCRIPTION_SUCCESS_URL || 'aura://subscription?checkout=success';
const CANCEL_URL = process.env.STRIPE_SUBSCRIPTION_CANCEL_URL || 'aura://subscription?checkout=cancel';

const ACTIVE_STATUSES = ['active', 'trialing', 'past_due'];

type Statut = 'active' | 'past_due' | 'canceled' | 'trialing';

function mapStripeStatus(status: Stripe.Subscription.Status): Statut {
  switch (status) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
    case 'incomplete':
      return 'past_due';
    case 'canceled':
    case 'incomplete_expired':
      return 'canceled';
    case 'paused':
      // Not a terminal state — the praticien may resume without re-subscribing. Folded into
      // past_due (the closest "needs attention, not yet over" state in this plan's coarser
      // 4-value enum) rather than canceled — see this plan's Design notes.
      return 'past_due';
    default:
      return 'past_due';
  }
}

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly stripeService: StripeService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private validationError(errors: Record<string, string[]>): never {
    throw new UnprocessableEntityException({ status: 'error', message: 'Erreur de validation', errors });
  }

  private async findOrCreateFor(praticien: Praticien): Promise<Subscription> {
    let sub = await this.subscriptions.findOneBy({ praticien_id: praticien.id });
    if (!sub) {
      sub = await this.subscriptions.save({ praticien_id: praticien.id, plan: 'essentiel', statut: 'active' });
    }
    return sub;
  }

  async current(praticien: Praticien) {
    return success(await this.findOrCreateFor(praticien));
  }

  async checkout(praticien: Praticien, dto: CreateCheckoutDto) {
    const sub = await this.findOrCreateFor(praticien);

    if (sub.plan === dto.plan && ACTIVE_STATUSES.includes(sub.statut)) {
      this.validationError({ plan: ['Vous êtes déjà abonné à cette formule.'] });
    }

    let customerId = sub.stripe_customer_id;
    if (!customerId) {
      const customer = await this.stripeService.createCustomer(praticien.email, {
        praticien_id: String(praticien.id),
      });
      customerId = customer.id;
      await this.subscriptions.update(sub.id, { stripe_customer_id: customerId });
    }

    // Switching between two paid plans: the old Stripe subscription is stopped once the new
    // one is confirmed active (onCheckoutCompleted below), not here — rather than juggling
    // subscription-item ids for an in-place price swap, see this plan's Design notes for why
    // cancel-then-recreate was chosen. Canceling only after confirmation (instead of before
    // creating the new Checkout Session) avoids leaving the praticien with zero active
    // subscription if session creation fails after an immediate cancel would have already
    // gone through.
    const session = await this.stripeService.createCheckoutSession({
      customerId,
      priceId: priceIdForPlan(dto.plan),
      successUrl: SUCCESS_URL,
      cancelUrl: CANCEL_URL,
      metadata: { praticien_id: String(praticien.id), plan: dto.plan },
    });
    return success({ url: session.url });
  }

  async cancel(praticien: Praticien) {
    const sub = await this.findOrCreateFor(praticien);
    if (!sub.stripe_subscription_id || !ACTIVE_STATUSES.includes(sub.statut)) {
      this.notFound('Aucun abonnement payant actif à résilier');
    }
    await this.stripeService.updateSubscriptionCancelAtPeriodEnd(sub.stripe_subscription_id);
    // statut is intentionally left as-is here (still 'active'/'trialing'/'past_due') — Stripe
    // keeps billing/access live until the current period ends, matching the platform's own
    // billing FAQ ("vous résiliez en un clic ... et restez actif jusqu'à la fin de la période
    // payée", web/lib/data/content.js's BILLING_FAQ). The real transition to 'canceled' is
    // webhook-driven (Task 7's onSubscriptionDeleted), mirroring Plan 05's rule that only the
    // Stripe webhook ever flips a confirmed billing state.
    return success(
      await this.subscriptions.findOneBy({ id: sub.id }),
      'Résiliation programmée en fin de période',
    );
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.subscriptions.createQueryBuilder('s')
      .leftJoinAndSelect('s.praticien', 'praticien')
      .orderBy('s.created_at', 'DESC');
    if (query.statut !== undefined) qb.andWhere('s.statut = :st', { st: query.statut });
    if (query.plan !== undefined) qb.andWhere('s.plan = :pl', { pl: query.plan });
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async adminStatistics() {
    const rows = await this.subscriptions.createQueryBuilder('s')
      .select('s.plan', 'plan')
      .addSelect('s.statut', 'statut')
      .addSelect('COUNT(s.id)', 'count')
      .groupBy('s.plan')
      .addGroupBy('s.statut')
      .getRawMany();

    const byPlan: Record<string, number> = { essentiel: 0, pro: 0, premium: 0 };
    let active_count = 0;
    let trialing_count = 0;
    let past_due_count = 0;
    let canceled_count = 0;
    let mrr = 0;

    for (const r of rows) {
      const count = Number(r.count);
      byPlan[r.plan] = (byPlan[r.plan] ?? 0) + count;
      if (r.statut === 'active') {
        active_count += count;
        mrr += count * (PLAN_PRICES[r.plan as keyof typeof PLAN_PRICES] ?? 0);
      } else if (r.statut === 'trialing') {
        trialing_count += count;
      } else if (r.statut === 'past_due') {
        past_due_count += count;
      } else if (r.statut === 'canceled') {
        canceled_count += count;
      }
    }

    return success({
      general: {
        mrr,
        active_count,
        trialing_count,
        past_due_count,
        canceled_count,
        by_plan: Object.entries(byPlan).map(([plan, count]) => ({ plan, count })),
      },
    });
  }

  // ---- Stripe webhook ----

  async handleStripeWebhookEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
        await this.onSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await this.onSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.payment_failed':
        await this.onInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
    }
    return success(undefined, 'ok');
  }

  private async onCheckoutCompleted(session: Stripe.Checkout.Session) {
    if (session.mode !== 'subscription') return;
    const praticienId = Number(session.metadata?.praticien_id);
    const plan = session.metadata?.plan;
    if (!praticienId || (plan !== 'pro' && plan !== 'premium')) return;

    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;
    if (!subscriptionId) return;
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;

    const sub = await this.subscriptions.findOneBy({ praticien_id: praticienId });
    if (!sub) return; // checkout() always runs findOrCreateFor() first, so this should exist

    // Capture the previous Stripe subscription id (if any) before overwriting the row, so a
    // plan-to-plan switch can cancel it now that the new subscription is confirmed active —
    // see the comment in checkout() for why this happens here rather than before Checkout
    // Session creation.
    const previousSubscriptionId = sub.stripe_subscription_id;

    await this.subscriptions.update(sub.id, {
      plan,
      statut: 'active',
      stripe_subscription_id: subscriptionId,
      ...(customerId ? { stripe_customer_id: customerId } : {}),
    });

    if (previousSubscriptionId && previousSubscriptionId !== subscriptionId) {
      await this.stripeService.cancelSubscriptionImmediately(previousSubscriptionId);
    }
  }

  private async onSubscriptionUpdated(subscription: Stripe.Subscription) {
    const sub = await this.subscriptions.findOneBy({ stripe_subscription_id: subscription.id });
    if (!sub) return;
    const periodEndSeconds = subscription.items?.data?.[0]?.current_period_end;
    await this.subscriptions.update(sub.id, {
      statut: mapStripeStatus(subscription.status),
      ...(periodEndSeconds ? { current_period_end: new Date(periodEndSeconds * 1000) } : {}),
    });
  }

  private async onSubscriptionDeleted(subscription: Stripe.Subscription) {
    const sub = await this.subscriptions.findOneBy({ stripe_subscription_id: subscription.id });
    if (!sub) return;
    // `plan` is left as-is (the last paid tier they were on) — see this plan's Design notes.
    // Both frontends derive *effective* access from statut, not plan alone.
    await this.subscriptions.update(sub.id, { statut: 'canceled' });
  }

  private async onInvoicePaymentFailed(invoice: Stripe.Invoice) {
    // Invoice.subscription was replaced by invoice.parent.subscription_details.subscription
    // in the API version this codebase is pinned to.
    const raw = invoice.parent?.subscription_details?.subscription;
    const subscriptionId = typeof raw === 'string' ? raw : raw?.id;
    if (!subscriptionId) return;
    const sub = await this.subscriptions.findOneBy({ stripe_subscription_id: subscriptionId });
    if (!sub) return;
    await this.subscriptions.update(sub.id, { statut: 'past_due' });
  }
}
