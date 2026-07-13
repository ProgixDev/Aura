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
import * as bcrypt from 'bcryptjs';

process.env.JWT_SECRET = process.env.JWT_SECRET ?? 'test-secret';
process.env.JWT_TTL_MINUTES = '60';

// All entities are listed explicitly (in addition to autoLoadEntities: true) so that every
// e2e test built on this factory gets the full schema, regardless of which feature module(s)
// it imports via `metadata.imports` — autoLoadEntities alone only picks up entities registered
// through TypeOrmModule.forFeature() somewhere in the compiled module tree, which is not
// guaranteed (e.g. this file's own database.e2e-spec.ts imports no feature module at all).
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement,
];

export async function createTestApp(metadata: ModuleMetadata = {}): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
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
  }).compile();
  const app = moduleRef.createNestApplication();
  applyGlobalConfig(app);
  await app.init();
  return app;
}

export async function seedAdmin(app: INestApplication, email = 'admin@test.io') {
  const ds = app.get(DataSource);
  const user = await ds.getRepository(User).save({
    name: 'Admin Test',
    email,
    password: await bcrypt.hash('password123', 10),
    is_admin: true,
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

export function signToken(app: INestApplication, user: User): string {
  return app.get(JwtService).sign(
    { user_id: user.id, email: user.email, is_admin: user.is_admin },
    { subject: String(user.id) },
  );
}
