import { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { DataSource } from 'typeorm';
import { applyGlobalConfig } from '../../src/app.setup';
import { AuthModule } from '../../src/auth/auth.module';
import { User } from '../../src/database/entities/user.entity';
import { Client } from '../../src/database/entities/client.entity';
import { Praticien } from '../../src/database/entities/praticien.entity';
import { PraticienDocument } from '../../src/database/entities/praticien-document.entity';
import { Cercle } from '../../src/database/entities/cercle.entity';
import { Event } from '../../src/database/entities/event.entity';
import { EventPraticien } from '../../src/database/entities/event-praticien.entity';
import { Promotion } from '../../src/database/entities/promotion.entity';
import { Discipline } from '../../src/database/entities/discipline.entity';
import { Article } from '../../src/database/entities/article.entity';
import { Notification } from '../../src/database/entities/notification.entity';
import { EmailTemplate } from '../../src/database/entities/email-template.entity';
import { Echange } from '../../src/database/entities/echange.entity';
import { Paiement } from '../../src/database/entities/paiement.entity';
import { Remboursement } from '../../src/database/entities/remboursement.entity';
import { RendezVous } from '../../src/database/entities/rendez-vous.entity';
import { Avis } from '../../src/database/entities/avis.entity';
import { Signalement } from '../../src/database/entities/signalement.entity';
import { Favorite } from '../../src/database/entities/favorite.entity';
import { NotificationPreference } from '../../src/database/entities/notification-preference.entity';
import { Conversation } from '../../src/database/entities/conversation.entity';
import { Message } from '../../src/database/entities/message.entity';
import { AuditLog } from '../../src/database/entities/audit-log.entity';
import { Dispute } from '../../src/database/entities/dispute.entity';
import { Subscription } from '../../src/database/entities/subscription.entity';
import { PlatformSetting } from '../../src/database/entities/platform-setting.entity';
import * as bcrypt from 'bcryptjs';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_TTL_MINUTES = '60';
// StorageService constructs a real @supabase/supabase-js client eagerly (mirroring
// StripeService's constructor pattern) — unlike Stripe's SDK, createClient() validates
// the URL and throws immediately on an empty string, so every e2e suite needs a
// syntactically valid dummy here even if it never touches storage.
process.env.SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'test-service-role-key';

// All entities are listed explicitly (in addition to autoLoadEntities: true) so that every
// e2e test built on this factory gets the full schema, regardless of which feature module(s)
// it imports via `metadata.imports` — autoLoadEntities alone only picks up entities registered
// through TypeOrmModule.forFeature() somewhere in the compiled module tree, which is not
// guaranteed (e.g. this file's own database.e2e-spec.ts imports no feature module at all).
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, RendezVous, Avis, Signalement, Favorite, NotificationPreference,
  Conversation, Message, AuditLog, Dispute, Subscription, PlatformSetting,
];

export async function createTestApp(
  metadata: Pick<ModuleMetadata, 'imports'> = {},
  overrides: Array<{ provide: any; useValue: any }> = [],
): Promise<INestApplication> {
  let builder = Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities: ALL_ENTITIES,
        autoLoadEntities: true,
        synchronize: true,
      }),
      AuthModule,
      ...(metadata.imports ?? []),
    ],
  });
  for (const o of overrides) {
    builder = builder.overrideProvider(o.provide).useValue(o.useValue);
  }
  const moduleRef = await builder.compile();
  // NB: TestingModule#createNestApplication(serverOrOptions, options) has a different arg
  // shape than NestFactory.create(moduleCls, serverOrOptions, options) — there's no moduleCls
  // to occupy the first slot here, so options must be passed as the *first* argument. Passing
  // it as a second argument after `undefined` silently drops it (Nest's internal ternary picks
  // arg0 as appOptions whenever arg0 isn't an HTTP adapter), which would leave `rawBody: true`
  // unapplied and req.rawBody undefined in every e2e test.
  const app = moduleRef.createNestApplication({ rawBody: true });
  applyGlobalConfig(app);
  await app.init();
  return app;
}

export async function seedAdmin(app: INestApplication, email = 'admin@test.io', role: string | null = 'admin') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Admin Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: true,
    role,
  });
  return { user, token: signToken(app, user) };
}

export async function seedClientUser(app: INestApplication, email = 'client@test.io') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Client Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: false,
  });
  const client = await ds.getRepository(Client).save({
    firstname: 'Client',
    lastname: 'Test',
    email,
    city: 'Paris',
  });
  return { user, client, token: signToken(app, user) };
}

export async function seedPraticienUser(app: INestApplication, email = 'praticien@test.io') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Praticien Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: false,
  });
  const praticien = await ds.getRepository(Praticien).save({
    firstname: 'Praticien',
    lastname: 'Test',
    email,
    telephone: '0600000000',
    ville: 'Paris',
    niveau: 'expert',
    specialite: 'yoga',
    mode: 'presentiel',
    status: 'actif',
    tarif: 50,
    experience: 3,
    bio: 'b'.repeat(60),
    statut_verification: 'valide',
  });
  return { user, praticien, token: signToken(app, user) };
}

export function signToken(app: INestApplication, user: User): string {
  return app.get(JwtService).sign(
    { user_id: user.id, email: user.email, is_admin: user.is_admin },
    { subject: String(user.id) },
  );
}
