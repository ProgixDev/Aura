import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { success } from '../common/envelope';
import { StripeService } from '../common/stripe.service';
import { PromotionsService } from '../promotions/promotions.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';

@Injectable()
export class RendezVousService {
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

    const paymentIntent = await this.stripeService.createPaymentIntent(
      Math.round(tarif * 100),
      { rendez_vous_id: String(saved.id) },
    );
    await this.rendezVous.update(saved.id, { stripe_payment_intent_id: paymentIntent.id });

    const fresh = await this.withRelations().where('rdv.id = :id', { id: saved.id }).getOne();
    return success({ rendez_vous: fresh, client_secret: paymentIntent.client_secret });
  }
}
