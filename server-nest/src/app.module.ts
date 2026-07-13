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

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({ ...buildDataSourceOptions(), autoLoadEntities: true }),
    AuthModule,
    AdminAuthModule,
    PraticienAuthModule,
    PraticienVerificationModule,
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
