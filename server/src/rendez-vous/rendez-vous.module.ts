import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RendezVous } from '../database/entities/rendez-vous.entity';
import { Paiement } from '../database/entities/paiement.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { RendezVousController } from './rendez-vous.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { RendezVousService } from './rendez-vous.service';
import { StripeService } from '../common/stripe.service';
import { PromotionsModule } from '../promotions/promotions.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { StripeConnectModule } from '../stripe-connect/stripe-connect.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([RendezVous, Paiement, Praticien]),
    PromotionsModule,
    SubscriptionsModule,
    StripeConnectModule,
  ],
  controllers: [RendezVousController, StripeWebhookController],
  providers: [RendezVousService, StripeService],
})
export class RendezVousModule {}
