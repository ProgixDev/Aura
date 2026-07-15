import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import Stripe from 'stripe';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { StripeService } from '../common/stripe.service';
import { getCommissionRate } from '../common/commission';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
  private readonly logger = new Logger(RendezVousService.name);

  constructor(
    @InjectRepository(RendezVous) private readonly rendezVous: Repository<RendezVous>,
    @InjectRepository(Paiement) private readonly paiements: Repository<Paiement>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    private readonly stripeService: StripeService,
    private readonly promotionsService: PromotionsService,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private withRelations() {
    return this.rendezVous.createQueryBuilder('rdv')
      .leftJoinAndSelect('rdv.praticien', 'praticien');
  }

  async create(client: Client, dto: CreateRendezVousDto) {
    const praticien = await this.praticiens.findOneBy({ id: dto.praticien_id });
    if (!praticien) this.notFound('Praticien introuvable');

    let tarif = praticien.tarif;
    let promotionId: number | null = null;
    if (dto.promotion_code) {
      const promo = await this.promotionsService.validate(dto.promotion_code);
      tarif = promo.type === 'pourcentage'
        ? tarif * (1 - promo.valeur / 100)
        : Math.max(0, tarif - promo.valeur);
      tarif = Math.round(tarif * 100) / 100;
      promotionId = promo.id;
    }

    const saved = await this.rendezVous.save({
      client_id: client.id,
      praticien_id: dto.praticien_id,
      date_heure: new Date(dto.date_heure),
      duree_minutes: 60,
      mode: dto.mode,
      statut: 'en_attente',
      tarif,
      promotion_id: promotionId,
    });

    const amountCents = Math.round(tarif * 100);
    let paymentIntent: Stripe.PaymentIntent;
    if (praticien.stripe_account_id && praticien.stripe_payouts_enabled) {
      // Standard Stripe Connect "destination charges" pattern — see StripeService.createPaymentIntent.
      paymentIntent = await this.stripeService.createPaymentIntent(
        amountCents,
        { rendez_vous_id: String(saved.id) },
        {
          applicationFeeAmount: Math.round(amountCents * getCommissionRate()),
          destination: praticien.stripe_account_id,
        },
      );
    } else {
      // Praticien hasn't finished Connect onboarding — never block the booking over payout
      // plumbing. The platform's own Stripe account still captures the full charge; the
      // praticien's share needs a manual payout later.
      this.logger.warn(
        `rendez_vous ${saved.id}: praticien ${praticien.id} n'a pas terminé l'onboarding Stripe Connect — paiement créé sans reversement automatique, versement manuel requis.`,
      );
      paymentIntent = await this.stripeService.createPaymentIntent(amountCents, { rendez_vous_id: String(saved.id) });
    }
    await this.rendezVous.update(saved.id, { stripe_payment_intent_id: paymentIntent.id });

    const fresh = await this.withRelations().where('rdv.id = :id', { id: saved.id }).getOne();
    return success({ rendez_vous: fresh, client_secret: paymentIntent.client_secret });
  }

  async indexForClient(client: Client, query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 10);
    const qb = this.withRelations().where('rdv.client_id = :cid', { cid: client.id });
    if (query.statut !== undefined) qb.andWhere('rdv.statut = :st', { st: query.statut });
    qb.orderBy('rdv.date_heure', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    return success(data, undefined, { pagination });
  }

  async showForClient(client: Client, id: number) {
    const rdv = await this.withRelations()
      .where('rdv.id = :id AND rdv.client_id = :cid', { id, cid: client.id }).getOne();
    if (!rdv) this.notFound('Rendez-vous non trouvé');
    return success(rdv);
  }

  async cancelForClient(client: Client, id: number) {
    const rdv = await this.rendezVous.findOneBy({
      id, client_id: client.id, statut: In(['en_attente', 'confirme']),
    });
    if (!rdv) this.notFound('Rendez-vous non trouvé ou ne peut pas être annulé');
    await this.rendezVous.update(id, { statut: 'annule' });
    const fresh = await this.withRelations().where('rdv.id = :id', { id }).getOne();
    return success(fresh, 'Rendez-vous annulé avec succès');
  }

  async handleStripeWebhookEvent(event: Stripe.Event) {
    if (event.type === 'payment_intent.succeeded') {
      await this.confirmFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
    } else if (event.type === 'payment_intent.payment_failed') {
      await this.cancelFromPaymentIntent(event.data.object as Stripe.PaymentIntent);
    }
    return success(undefined, 'ok');
  }

  private async confirmFromPaymentIntent(intent: Stripe.PaymentIntent) {
    const rdvId = Number(intent.metadata?.rendez_vous_id);
    if (!rdvId) return;
    const rdv = await this.rendezVous.findOneBy({ id: rdvId });
    // A client-initiated cancel can race a Stripe webhook that was already in flight (Stripe
    // retries undelivered events for hours) — never let a late success event resurrect a
    // booking the client explicitly cancelled.
    if (!rdv || rdv.statut === 'annule') return;

    await this.rendezVous.update(rdvId, { statut: 'confirme' });

    const existing = await this.paiements.findOneBy({ rendez_vous_id: rdvId });
    if (existing) return; // idempotent: this event was already processed

    // Read the commission actually attached to this PaymentIntent straight off the Stripe
    // payload — 0 when the booking used the no-Connect fallback in create() above, so this
    // always matches what Stripe really charged rather than being recomputed from a rate
    // that could differ between booking creation and webhook delivery.
    const commissionCents = intent.application_fee_amount ?? 0;
    const commission = Math.round(commissionCents) / 100;
    const montantNetPraticien = Math.round((rdv.tarif - commission) * 100) / 100;

    try {
      await this.paiements.save({
        reference: `RDV-${rdv.id}-${Date.now()}`,
        client_id: rdv.client_id,
        praticien_id: rdv.praticien_id,
        rendez_vous_id: rdv.id,
        montant_brut: rdv.tarif,
        commission,
        montant_net_praticien: montantNetPraticien,
        moyen_paiement: 'card',
        statut: 'paid',
        date_paiement: new Date(),
      });
    } catch (err) {
      // The findOneBy check above is a TOCTOU race under concurrent/duplicate webhook
      // delivery — the real backstop is the UNIQUE constraint on rendez_vous_id (see the
      // Paiement entity / RendezVous migration). A concurrent delivery of the same event may
      // have already inserted the row between our check and this save; that's fine, idempotent.
      if (!this.isDuplicatePaiementError(err)) throw err;
    }
  }

  private async cancelFromPaymentIntent(intent: Stripe.PaymentIntent) {
    const rdvId = Number(intent.metadata?.rendez_vous_id);
    if (!rdvId) return;
    const rdv = await this.rendezVous.findOneBy({ id: rdvId });
    // Stripe doesn't guarantee webhook event ordering — a stale payment_intent.payment_failed
    // from an earlier failed attempt must not un-confirm a booking a later attempt already paid.
    if (!rdv || rdv.statut === 'confirme') return;
    await this.rendezVous.update(rdvId, { statut: 'annule' });
  }

  private isDuplicatePaiementError(err: unknown): boolean {
    const code = (err as { code?: string } | undefined)?.code;
    if (code === 'ER_DUP_ENTRY' || code === 'SQLITE_CONSTRAINT_UNIQUE' || code === 'SQLITE_CONSTRAINT') {
      return true;
    }
    const message = (err as { message?: string } | undefined)?.message ?? '';
    return /UNIQUE constraint failed|Duplicate entry/i.test(message);
  }
}
