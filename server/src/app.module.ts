import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { buildDataSourceOptions } from './database/typeorm.config';
import { AuthModule } from './auth/auth.module';
import { AdminAuthModule } from './auth/admin-auth/admin-auth.module';
import { PraticienAuthModule } from './auth/praticien-auth/praticien-auth.module';
import { PraticienVerificationModule } from './auth/praticien-verification/praticien-verification.module';
import { ClientAuthModule } from './auth/client-auth/client-auth.module';
import { UnifiedAuthModule } from './auth/unified-auth/unified-auth.module';
import { CerclesModule } from './cercles/cercles.module';
import { EventsModule } from './events/events.module';
import { PromotionsModule } from './promotions/promotions.module';
import { DisciplinesModule } from './disciplines/disciplines.module';
import { ClientsModule } from './clients/clients.module';
import { PraticiensModule } from './praticiens/praticiens.module';
import { ArticlesModule } from './articles/articles.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EmailTemplatesModule } from './email-templates/email-templates.module';
import { EchangesModule } from './echanges/echanges.module';
import { PaiementsModule } from './paiements/paiements.module';
import { RemboursementsModule } from './remboursements/remboursements.module';
import { RendezVousModule } from './rendez-vous/rendez-vous.module';
import { AvisModule } from './avis/avis.module';
import { SignalementsModule } from './signalements/signalements.module';
import { FavoritesModule } from './favorites/favorites.module';
import { NotificationPreferencesModule } from './notification-preferences/notification-preferences.module';
import { ConversationsModule } from './conversations/conversations.module';
import { PeerMessagesModule } from './peer-messages/peer-messages.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { DisputesModule } from './disputes/disputes.module';
import { PlatformSettingsModule } from './platform-settings/platform-settings.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { StripeConnectModule } from './stripe-connect/stripe-connect.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SupportModule } from './support/support.module';
import { StatsModule } from './stats/stats.module';
import { ClientActivityModule } from './client-activity/client-activity.module';
import { AdminContactModule } from './admin-contact/admin-contact.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...buildDataSourceOptions(), autoLoadEntities: true }),
    AuthModule,
    AdminAuthModule,
    PraticienAuthModule,
    PraticienVerificationModule,
    ClientAuthModule,
    UnifiedAuthModule,
    CerclesModule,
    EventsModule,
    PromotionsModule,
    DisciplinesModule,
    ClientsModule,
    PraticiensModule,
    ArticlesModule,
    NotificationsModule,
    EmailTemplatesModule,
    EchangesModule,
    PaiementsModule,
    RemboursementsModule,
    AvisModule,
    SignalementsModule,
    FavoritesModule,
    NotificationPreferencesModule,
    RendezVousModule,
    ConversationsModule,
    PeerMessagesModule,
    AuditLogModule,
    DisputesModule,
    PlatformSettingsModule,
    SubscriptionsModule,
    StripeConnectModule,
    AnalyticsModule,
    SupportModule,
    StatsModule,
    ClientActivityModule,
    AdminContactModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
