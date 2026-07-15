# Aura Plan 08a — Messaging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real REST-backed 1:1 client↔praticien messaging system (conversations + messages, no group/circle chat) and wire every existing messaging UI surface — mobile client, new mobile praticien surface, web client, web admin moderation — to it, replacing the last fully-mocked chat experience in the app.

**Architecture:** Two new tables (`conversations`, `messages`) get a single migration, then an entity + DTO + service + controller + module treatment mirroring the `avis`/`signalements`/`favorites` modules from Plan 07 exactly: a bare `@Controller()` with full per-method paths (`@Get('client/conversations')`, `@Get('praticien/conversations')`, `@Get('admin/conversations')`), `success()`/`fail()` envelopes, `parsePagination`/`paginateQb` for the admin list only. Praticien-side routes need a `PraticienGuard` that does not exist yet in this codebase — this plan creates it as reusable infrastructure (mirroring `ClientGuard` exactly: resolve `req.user.email` against the `praticiens` table, attach `req.praticien`), registered in the already-`@Global()` `AuthModule` alongside `ClientGuard`/`AdminGuard` so later Plan 08 sub-plans (08e subscriptions, 08f Stripe Connect) can depend on it without re-deriving it. Transport is plain REST with react-query polling (`refetchInterval`) on the message-thread queries only — the codebase has no WebSocket/socket.io infrastructure anywhere and this plan does not introduce one, matching decision P8-1 in the approved design spec. `Conversation.kind: 'practitioner' | 'circle'` (mobile-only, added by Plan 09 as a pure UI filter label with zero backend concept) and `ChatMessage.proposal` (a booking-slot-preview bubble, also purely mock/decorative, no backend concept) are both removed rather than kept as dead weight — every real conversation is client↔praticien by construction, so a "kind" field with only one possible value serves no purpose, and no server concept of an in-chat booking proposal exists or is in scope.

**Tech Stack:** NestJS 11 + TypeORM 0.3 + class-validator (server, unchanged); Next.js 15 + `@tanstack/react-query` (web, unchanged); Expo Router + `@tanstack/react-query` + zustand (mobile, unchanged). No new dependencies on any of the three codebases.

**Reference:** [Plan 08 design spec](../specs/2026-07-15-aura-08-heavy-modules-design.md) · [Plan 07 (closest structural analog)](2026-07-13-aura-07-greenfield-cheap.md) · [Plan 03 (client auth / guard pattern)](2026-07-13-aura-03-client-auth.md)

**Depends on:** nothing else in Plan 08 (08a is explicitly first and independent per the design spec's sequencing). Assumes Plans 01–07 and 09 are already landed — in particular the `ClientGuard`/`AdminGuard`/`JwtAuthGuard` infrastructure and the `avis`/`favorites`/`signalements`/`notification-preferences` modules this plan mirrors.

**Run each `npm` command from the relevant package dir** (`server/`, `web/`, `mobile/`), not the repo root.

**A note on a pre-existing, out-of-scope gap this plan does not fix:** mobile has no real praticien login flow today. `mobile/app/onboarding/role.tsx` lets a user pick `role: 'practitioner'` in local zustand state, but `mobile/app/onboarding/auth.tsx` always calls `/client/login` or `/client/register` regardless of that choice — there is no call anywhere in mobile to `/v1/praticien/login`. This means `dashboard.tsx` (and this plan's new `praticien-messages/*` screens under it) are reachable in the running app, but the JWT in `session.token` at that point is a **client** token, which will 403 against `PraticienGuard`-protected routes unless the developer has separately authenticated as a praticien (e.g. via a REST client) and manually placed that token in the session store for manual testing. Building a real mobile praticien login screen is a distinct, non-trivial scope (new form, new session shape decisions, likely touches `useSession`'s `Role`/token model) that the Plan 08 design spec does not ask 08a to build, and inventing it here would be unrequested scope creep. This plan builds the praticien-side messaging screens and endpoints correctly against `PraticienGuard`; wiring a real mobile praticien login is flagged here as follow-up work for whichever future plan actually owns mobile praticien auth.

---

## File structure

| File | Responsibility |
|---|---|
| `server/src/database/migrations/1700000000003-AddConversationsAndMessages.ts` (create) | Raw-SQL migration for the 2 new tables |
| `server/src/database/entities/conversation.entity.ts` (create) | `Conversation` entity — unique (client_id, praticien_id) pair |
| `server/src/database/entities/message.entity.ts` (create) | `Message` entity — sender_role, text, read_at, flagged |
| `server/src/auth/guards/praticien.guard.ts` (create) | `PraticienGuard` — resolves `req.praticien` from JWT email, mirrors `ClientGuard` |
| `server/src/auth/decorators.ts` (modify) | Add `CurrentPraticien` param decorator |
| `server/src/auth/auth.module.ts` (modify) | Register `Praticien` repo + `PraticienGuard` as global providers/exports |
| `server/src/conversations/*` (create) | Conversations module: client, praticien, admin endpoints |
| `server/test/conversations.e2e-spec.ts` (create) | Full e2e coverage: client/praticien/admin flows, guard isolation, read tracking, flagging |
| `server/test/utils/create-test-app.ts` (modify) | Register `Conversation`/`Message` in `ALL_ENTITIES`, add `seedPraticienUser` helper |
| `server/src/app.module.ts` (modify) | Register `ConversationsModule` |
| `mobile/src/data/types.ts` (modify) | `Conversation`: drop `kind`; `ChatMessage`: drop `proposal`, add `createdAtIso` |
| `mobile/src/utils/chatDayMarks.ts` (create) | Pure day-separator grouping for a message thread |
| `mobile/src/utils/chatDayMarks.test.ts` (create) | Tests for the above |
| `mobile/src/utils/appendOptimisticMessage.ts` (modify) | Set `createdAtIso` on the optimistic message |
| `mobile/src/utils/appendOptimisticMessage.test.ts` (modify) | Fixture updated for the new required `createdAtIso` field |
| `mobile/src/data/repos/index.ts` (modify) | Real `messageRepo` (client) + new `praticienMessageRepo`, mapping functions |
| `mobile/src/data/mock/messages.ts` (delete) | No longer imported once `repos/index.ts` is real |
| `mobile/src/components/ChatBubble.tsx` (create) | Shared message bubble, used by both client and praticien chat screens |
| `mobile/src/components/ChatComposer.tsx` (create) | Shared text input + send button row |
| `mobile/src/components/Icon.tsx` (modify) | Add a `'message'` icon case (reused from the tab bar's inline SVG) |
| `mobile/app/(tabs)/messages.tsx` (modify) | Real client conversation list, polling removed (list doesn't poll), filters reduced to Tous/Non lus |
| `mobile/app/chat/[id].tsx` (modify) | Real client chat thread, polling, send mutation, day marks |
| `mobile/app/praticien/[id].tsx` (modify) | "Contacter" button starts/opens a real conversation |
| `mobile/app/dashboard.tsx` (modify) | Real "Mes messages" row with unread count |
| `mobile/app/praticien-messages/index.tsx` (create) | Praticien-side conversation list |
| `mobile/app/praticien-messages/[id].tsx` (create) | Praticien-side chat thread |
| `mobile/app/_layout.tsx` (modify) | Register the 2 new praticien-messages screens |
| `web/lib/data/messages.js` (delete) | No longer imported once all 4 consumer pages are repointed |
| `web/app/(site)/compte/messages/page.jsx` (modify) + `MessagesList.jsx` (create) | Real client conversation list, extracted client component |
| `web/app/(site)/compte/message/[id]/page.jsx` (modify) | Real client chat thread, converted to a client component |
| `web/app/admin/messages/page.jsx` (modify) | Real admin moderation list |
| `web/app/admin/message/[id]/page.jsx` (modify) | Real admin read-only thread with per-message flag/unflag |
| `web/app/(site)/praticien/[id]/page.jsx` (modify) | "Contacter" modal starts a real conversation |

---

## Task 1: Migration — `conversations` + `messages` tables

**Files:**
- Create: `server/src/database/migrations/1700000000003-AddConversationsAndMessages.ts`

- [ ] **Step 1: Write the migration**

Create `server/src/database/migrations/1700000000003-AddConversationsAndMessages.ts`:

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConversationsAndMessages1700000000003
  implements MigrationInterface
{
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE conversations (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_conversations_client_praticien (client_id, praticien_id),
      CONSTRAINT fk_conv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_conv_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      conversation_id BIGINT UNSIGNED NOT NULL,
      sender_role VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      flagged TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NULL,
      CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of ['messages', 'conversations']) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
```

- [ ] **Step 2: Verify it compiles**

Run (in `server/`): `npm run build`
Expected: Build succeeds (no TypeScript errors). This only proves the file is valid `MigrationInterface` TypeScript — it does not run the SQL.

- [ ] **Step 3: Run the migration against a real database, if available**

Run (in `server/`): `npm run migration:run`
Expected: Output lists `AddConversationsAndMessages1700000000003` as executed successfully, against the MySQL instance configured by `server/.env`'s `DB_*` variables. **If no local MySQL instance is configured in this environment, skip this step** — every later task's e2e suite validates the equivalent schema shape against an in-memory SQLite database built from the TypeORM entities (Task 2/3), independent of this migration file having been run anywhere.

- [ ] **Step 4: Commit**

```bash
git add server/src/database/migrations/1700000000003-AddConversationsAndMessages.ts
git commit -m "feat(server): add conversations and messages migration"
```

---

## Task 2: Entities + `PraticienGuard` + auth wiring

**Files:**
- Create: `server/src/database/entities/conversation.entity.ts`, `server/src/database/entities/message.entity.ts`
- Create: `server/src/auth/guards/praticien.guard.ts`
- Modify: `server/src/auth/decorators.ts`, `server/src/auth/auth.module.ts`
- Modify: `server/test/utils/create-test-app.ts`

**Ground truth (verified, not to be re-derived):** `PraticienGuard` does not exist in this codebase yet. Praticien login (`server/src/auth/praticien-auth/praticien-auth.service.ts`) issues the exact same JWT shape as client/admin login — `TokenService.tokenPayload(user)` off the shared `users` table — and a praticien's identity resolves by looking up `req.user.email` against the `praticiens` table, exactly how `ClientGuard` resolves a client off `req.user.email` against `clients`. `AuthModule` is `@Global()` and already imports `TypeOrmModule.forFeature([User, Client])` to give `ClientGuard` its `Repository<Client>` — it does **not** currently import `Praticien`, so `PraticienGuard` needs `Praticien` added there too.

- [ ] **Step 1: Write the `Conversation` entity**

Create `server/src/database/entities/conversation.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany,
  PrimaryGeneratedColumn, Unique, UpdateDateColumn,
} from 'typeorm';
import { Client } from './client.entity';
import { Praticien } from './praticien.entity';
import { Message } from './message.entity';

@Entity('conversations')
@Unique(['client_id', 'praticien_id'])
export class Conversation {
  @PrimaryGeneratedColumn() id: number;
  @Column() client_id: number;
  @Column() praticien_id: number;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;
  @UpdateDateColumn({ name: 'updated_at' }) updated_at: Date;

  @ManyToOne(() => Client, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'client_id' })
  client: Client;

  @ManyToOne(() => Praticien, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'praticien_id' })
  praticien: Praticien;

  @OneToMany(() => Message, (m) => m.conversation)
  messages: Message[];
}
```

- [ ] **Step 2: Write the `Message` entity**

Create `server/src/database/entities/message.entity.ts`:

```typescript
import {
  Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn,
} from 'typeorm';
import { Conversation } from './conversation.entity';

@Entity('messages')
export class Message {
  @PrimaryGeneratedColumn() id: number;
  @Column() conversation_id: number;
  @Column({ type: 'varchar', length: 20 }) sender_role: 'client' | 'praticien';
  @Column({ type: 'text' }) text: string;
  @Column({ type: 'datetime', nullable: true }) read_at: Date | null;
  @Column({ default: false }) flagged: boolean;
  @CreateDateColumn({ name: 'created_at' }) created_at: Date;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'conversation_id' })
  conversation: Conversation;
}
```

- [ ] **Step 3: Register both entities and add `seedPraticienUser` in the e2e test harness**

In `server/test/utils/create-test-app.ts`, add the two new entity imports near the other entity imports:

```typescript
import { Conversation } from '../../src/database/entities/conversation.entity';
import { Message } from '../../src/database/entities/message.entity';
```

Add them to `ALL_ENTITIES`:

```typescript
const ALL_ENTITIES = [
  User, Client, Praticien, PraticienDocument, Cercle, Event, EventPraticien,
  Promotion, Discipline, Article, Notification, EmailTemplate, Echange, Paiement,
  Remboursement, RendezVous, Avis, Signalement, Favorite, NotificationPreference,
  Conversation, Message,
];
```

Add a `seedPraticienUser` helper next to the existing `seedClientUser`/`seedAdmin` (same file, after `seedClientUser`):

```typescript
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
```

- [ ] **Step 4: Run build to verify the entities and harness changes compile**

Run (in `server/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 5: Write `PraticienGuard`**

Create `server/src/auth/guards/praticien.guard.ts`:

```typescript
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Praticien } from '../../database/entities/praticien.entity';

@Injectable()
export class PraticienGuard implements CanActivate {
  constructor(@InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const praticien = req.user?.email
      ? await this.praticiens.findOneBy({ email: req.user.email })
      : null;
    if (!praticien) {
      throw new ForbiddenException({
        status: 'error',
        message: "Vous n'êtes pas autorisé à accéder à cette ressource.",
      });
    }
    req.praticien = praticien;
    return true;
  }
}
```

- [ ] **Step 6: Add the `CurrentPraticien` decorator**

Replace the full contents of `server/src/auth/decorators.ts`:

```typescript
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
export const CurrentClient = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().client,
);
export const CurrentPraticien = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().praticien,
);
```

- [ ] **Step 7: Wire `PraticienGuard` into the global `AuthModule`**

Replace the full contents of `server/src/auth/auth.module.ts`:

```typescript
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../database/entities/user.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ClientGuard } from './guards/client.guard';
import { PraticienGuard } from './guards/praticien.guard';
import { OptionalJwtGuard } from './guards/optional-jwt.guard';
import { HashService } from './hash.service';
import { TokenService } from './token.service';

@Global()
@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([User, Client, Praticien]),
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: parseInt(process.env.JWT_TTL_MINUTES ?? '60', 10) * 60 },
      }),
    }),
  ],
  providers: [
    JwtStrategy, JwtAuthGuard, AdminGuard, ClientGuard, PraticienGuard,
    OptionalJwtGuard, HashService, TokenService,
  ],
  exports: [
    JwtModule, TypeOrmModule, JwtAuthGuard, AdminGuard, ClientGuard, PraticienGuard,
    OptionalJwtGuard, HashService, TokenService,
  ],
})
export class AuthModule {}
```

This mirrors exactly how `RendezVousModule` already re-declares `TypeOrmModule.forFeature([..., Praticien])` for its own direct repository injection even though `Praticien` is also registered elsewhere — NestJS TypeORM allows the same entity to be registered via `forFeature` in multiple modules with no conflict, each getting its own module-scoped repository provider bound to the same underlying `DataSource`.

- [ ] **Step 8: Run build to verify the guard and module wiring compile**

Run (in `server/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Run the full e2e suite to check for regressions**

Run (in `server/`): `npm run test:e2e`
Expected: PASS (no existing suite depends on the changed files' old shape).

- [ ] **Step 10: Commit**

```bash
git add server/src/database/entities/conversation.entity.ts server/src/database/entities/message.entity.ts server/src/auth/guards/praticien.guard.ts server/src/auth/decorators.ts server/src/auth/auth.module.ts server/test/utils/create-test-app.ts
git commit -m "feat(server): add conversations/messages entities and PraticienGuard"
```

---

## Task 3: Conversations module — client, praticien, admin endpoints

**Files:**
- Create: `server/src/conversations/dto/create-conversation-client.dto.ts`, `create-conversation-praticien.dto.ts`, `send-message.dto.ts`
- Create: `server/src/conversations/conversations.service.ts`, `conversations.controller.ts`, `conversations.module.ts`
- Create: `server/test/conversations.e2e-spec.ts`
- Modify: `server/src/app.module.ts`

**Endpoint shapes (design decisions, not to be second-guessed by the implementer):**
- `POST /client/conversations` body `{ praticien_id: number; text?: string }` upserts the (client, praticien) conversation and, if `text` is non-blank, also appends the opening message in the same call. This is the single entry point both the mobile "Contacter" button (no `text`, just get-or-create then let the user type in the chat screen) and the web "Contacter" modal (collects `text` inline, sends it atomically) use. It returns `{ conversation, message }` with `message: null` when no text was sent. Route uses `@HttpCode(200)` rather than the default 201, matching this codebase's existing convention for idempotent-upsert POSTs (`FavoritesController.store` — adding an existing favorite twice is also a 200, not 201-then-409).
- `GET /client/conversations/:id/messages` and its praticien mirror are **not paginated** — they return the full thread ascending by `created_at`. Every other list-style endpoint in this codebase that's scoped to "my own stuff" (`avis.mine()`, `favorites.list()`) is likewise unpaginated; only the admin-wide `GET /admin/conversations` uses `parsePagination`/`paginateQb`, matching `avis.adminIndex`/`signalements.adminIndex`. A single conversation's message count is not expected to reach a scale where this matters for an MVP chat feature — revisit if that assumption breaks.
- Viewing a thread (`GET .../messages`, either role) marks the *other* party's unread messages as read as a side effect. This is deliberate: it is the only reasonable place to implement "read receipts" without extra endpoints, and the polling interval on the client already re-fetches this route regularly.

- [ ] **Step 1: Write the DTOs**

Create `server/src/conversations/dto/create-conversation-client.dto.ts`:

```typescript
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationClientDto {
  @IsInt() praticien_id: number;
  @IsOptional() @IsString() @MinLength(1) text?: string;
}
```

Create `server/src/conversations/dto/create-conversation-praticien.dto.ts`:

```typescript
import { IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateConversationPraticienDto {
  @IsInt() client_id: number;
  @IsOptional() @IsString() @MinLength(1) text?: string;
}
```

Create `server/src/conversations/dto/send-message.dto.ts`:

```typescript
import { IsString, MaxLength, MinLength } from 'class-validator';

export class SendMessageDto {
  @IsString() @MinLength(1) @MaxLength(5000) text: string;
}
```

- [ ] **Step 2: Write the failing e2e spec**

Create `server/test/conversations.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp, seedAdmin, seedClientUser, seedPraticienUser,
} from './utils/create-test-app';
import { ConversationsModule } from '../src/conversations/conversations.module';

describe('conversations', () => {
  let app: INestApplication;
  let clientToken: string;
  let clientId: number;
  let otherClientToken: string;
  let praticienToken: string;
  let praticienId: number;
  let adminToken: string;
  let conversationId: number;

  beforeAll(async () => {
    app = await createTestApp({ imports: [ConversationsModule] });
    const client = await seedClientUser(app, 'conv-client@aura.io');
    clientToken = client.token;
    clientId = client.client.id;
    otherClientToken = (await seedClientUser(app, 'conv-other-client@aura.io')).token;
    const praticien = await seedPraticienUser(app, 'conv-praticien@aura.io');
    praticienToken = praticien.token;
    praticienId = praticien.praticien.id;
    adminToken = (await seedAdmin(app, 'conv-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const asClient = (r: request.Test) => r.set('Authorization', `Bearer ${clientToken}`);
  const asOtherClient = (r: request.Test) => r.set('Authorization', `Bearer ${otherClientToken}`);
  const asPraticien = (r: request.Test) => r.set('Authorization', `Bearer ${praticienToken}`);
  const asAdmin = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  it('requires auth on every role-scoped route', async () => {
    await http().get('/api/client/conversations').expect(401);
    await http().post('/api/client/conversations').send({ praticien_id: praticienId }).expect(401);
    await http().get('/api/praticien/conversations').expect(401);
    await http().get('/api/admin/conversations').expect(401);
  });

  it('PraticienGuard rejects a client token — it is a separate identity from ClientGuard', async () => {
    await asClient(http().get('/api/praticien/conversations')).expect(403);
  });

  it('ClientGuard rejects a praticien token — it is a separate identity from PraticienGuard', async () => {
    await asPraticien(http().get('/api/client/conversations')).expect(403);
  });

  it('client store validates praticien_id, 404s on an unknown praticien, and creates with an optional first message', async () => {
    const bad = await asClient(http().post('/api/client/conversations')).send({}).expect(422);
    expect(bad.body.errors.praticien_id).toBeDefined();

    const missing = await asClient(http().post('/api/client/conversations'))
      .send({ praticien_id: 999999 }).expect(404);
    expect(missing.body.message).toBe('Praticien introuvable');

    const res = await asClient(http().post('/api/client/conversations'))
      .send({ praticien_id: praticienId, text: 'Bonjour, je découvre votre profil.' })
      .expect(200);
    expect(res.body.data.conversation.praticien_id).toBe(praticienId);
    expect(res.body.data.conversation.client_id).toBe(clientId);
    expect(res.body.data.message.sender_role).toBe('client');
    expect(res.body.data.message.text).toBe('Bonjour, je découvre votre profil.');
    conversationId = res.body.data.conversation.id;
  });

  it('re-posting for the same praticien upserts the existing conversation instead of duplicating it', async () => {
    const res = await asClient(http().post('/api/client/conversations'))
      .send({ praticien_id: praticienId }).expect(200);
    expect(res.body.data.conversation.id).toBe(conversationId);
    expect(res.body.data.message).toBeNull();

    const list = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
  });

  it('client index returns the praticien joined, last_message, and unread_count', async () => {
    const res = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(res.body.data).toHaveLength(1);
    const row = res.body.data[0];
    expect(row.praticien).toMatchObject({ id: praticienId });
    expect(row.last_message.text).toBe('Bonjour, je découvre votre profil.');
    expect(row.unread_count).toBe(0); // a client's own message is never "unread" from their own view
  });

  it('client show 404s for a conversation that belongs to a different client', async () => {
    await asOtherClient(http().get(`/api/client/conversations/${conversationId}`)).expect(404);
  });

  it('SendMessageDto rejects an empty message', async () => {
    const res = await asClient(http().post(`/api/client/conversations/${conversationId}/messages`))
      .send({ text: '' }).expect(422);
    expect(res.body.errors.text).toBeDefined();
  });

  it('praticien sees the conversation the client started, with unread_count for the opening message', async () => {
    const list = await asPraticien(http().get('/api/praticien/conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].id).toBe(conversationId);
    expect(list.body.data[0].client).toMatchObject({ id: clientId });
    expect(list.body.data[0].unread_count).toBe(1); // client's opening message, unread by the praticien
  });

  it('praticien can reply', async () => {
    const reply = await asPraticien(http().post(`/api/praticien/conversations/${conversationId}/messages`))
      .send({ text: 'Bonjour, avec plaisir !' }).expect(201);
    expect(reply.body.data.sender_role).toBe('praticien');
    expect(reply.body.data.conversation_id).toBe(conversationId);
  });

  it("reading a conversation's messages marks the other party's messages as read", async () => {
    // Praticien reads the thread — marks the client's opening message read.
    await asPraticien(http().get(`/api/praticien/conversations/${conversationId}/messages`)).expect(200);
    const praticienList = await asPraticien(http().get('/api/praticien/conversations')).expect(200);
    expect(praticienList.body.data[0].unread_count).toBe(0);

    // Client has not yet read the praticien's reply.
    const clientList = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(clientList.body.data[0].unread_count).toBe(1);

    // Client reads the thread — marks the praticien's reply read.
    await asClient(http().get(`/api/client/conversations/${conversationId}/messages`)).expect(200);
    const clientListAfter = await asClient(http().get('/api/client/conversations')).expect(200);
    expect(clientListAfter.body.data[0].unread_count).toBe(0);
  });

  it('the thread is ordered oldest-first and includes both senders', async () => {
    const res = await asClient(http().get(`/api/client/conversations/${conversationId}/messages`)).expect(200);
    expect(res.body.data.map((m: any) => m.sender_role)).toEqual(['client', 'praticien']);
  });

  it('praticien store validates client_id, 404s on an unknown client, and reuses an existing conversation', async () => {
    const missing = await asPraticien(http().post('/api/praticien/conversations'))
      .send({ client_id: 999999 }).expect(404);
    expect(missing.body.message).toBe('Client introuvable');

    const res = await asPraticien(http().post('/api/praticien/conversations'))
      .send({ client_id: clientId }).expect(200);
    expect(res.body.data.conversation.id).toBe(conversationId);
    expect(res.body.data.message).toBeNull();
  });

  it('admin routes require AdminGuard, paginate, and count messages/flags per conversation', async () => {
    await http().get('/api/admin/conversations').expect(401);
    await asClient(http().get('/api/admin/conversations')).expect(403);

    const list = await asAdmin(http().get('/api/admin/conversations')).expect(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].message_count).toBe(2);
    expect(list.body.data[0].flagged_count).toBe(0);
    expect(list.body.pagination).toBeDefined();

    const show = await asAdmin(http().get(`/api/admin/conversations/${conversationId}`)).expect(200);
    expect(show.body.data.messages).toHaveLength(2);
    expect(show.body.data.client).toBeDefined();
    expect(show.body.data.praticien).toBeDefined();
  });

  it('admin can flag and unflag an individual message', async () => {
    const show = await asAdmin(http().get(`/api/admin/conversations/${conversationId}`)).expect(200);
    const messageId = show.body.data.messages[0].id;

    const flagged = await asAdmin(http().post(`/api/admin/messages/${messageId}/flag`)).expect(200);
    expect(flagged.body.data.flagged).toBe(true);

    const list = await asAdmin(http().get('/api/admin/conversations')).expect(200);
    expect(list.body.data[0].flagged_count).toBe(1);

    const unflagged = await asAdmin(http().post(`/api/admin/messages/${messageId}/unflag`)).expect(200);
    expect(unflagged.body.data.flagged).toBe(false);

    const listAfter = await asAdmin(http().get('/api/admin/conversations')).expect(200);
    expect(listAfter.body.data[0].flagged_count).toBe(0);
  });
});
```

- [ ] **Step 3: Run the spec to verify it fails**

Run: `npm run test:e2e -- conversations.e2e-spec.ts`
Expected: FAIL — `Cannot find module '../src/conversations/conversations.module'` (the module doesn't exist yet).

- [ ] **Step 4: Write the service**

Create `server/src/conversations/conversations.service.ts`:

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { success } from '../common/envelope';
import { parsePagination, paginateQb } from '../common/pagination';
import { CreateConversationClientDto } from './dto/create-conversation-client.dto';
import { CreateConversationPraticienDto } from './dto/create-conversation-praticien.dto';
import { SendMessageDto } from './dto/send-message.dto';

type Role = 'client' | 'praticien';

@Injectable()
export class ConversationsService {
  constructor(
    @InjectRepository(Conversation) private readonly conversations: Repository<Conversation>,
    @InjectRepository(Message) private readonly messages: Repository<Message>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
  ) {}

  private notFound(message: string): never {
    throw new NotFoundException({ status: 'error', message });
  }

  private async lastMessageFor(conversationId: number): Promise<Message | null> {
    return this.messages.createQueryBuilder('m')
      .where('m.conversation_id = :id', { id: conversationId })
      .orderBy('m.created_at', 'DESC')
      .getOne();
  }

  private async unreadCountFor(conversationId: number, incomingRole: Role): Promise<number> {
    return this.messages.count({
      where: { conversation_id: conversationId, sender_role: incomingRole, read_at: IsNull() },
    });
  }

  private async withViewerMeta(conversation: Conversation, viewerRole: Role) {
    const otherRole: Role = viewerRole === 'client' ? 'praticien' : 'client';
    const [last_message, unread_count] = await Promise.all([
      this.lastMessageFor(conversation.id),
      this.unreadCountFor(conversation.id, otherRole),
    ]);
    return { ...conversation, last_message, unread_count };
  }

  private async markRead(conversationId: number, incomingRole: Role) {
    const unread = await this.messages.find({
      where: { conversation_id: conversationId, sender_role: incomingRole, read_at: IsNull() },
    });
    if (unread.length === 0) return;
    const now = new Date();
    await this.messages.save(unread.map((m) => ({ ...m, read_at: now })));
  }

  private async touch(conversationId: number) {
    await this.conversations.save({ id: conversationId, updated_at: new Date() });
  }

  // ---- shared upsert-or-create, parameterised by role ----

  private async storeFor(
    viewerRole: Role,
    ownerId: number,
    otherId: number,
    text: string | undefined,
  ) {
    const where = viewerRole === 'client'
      ? { client_id: ownerId, praticien_id: otherId }
      : { client_id: otherId, praticien_id: ownerId };

    let conversation = await this.conversations.findOneBy(where);
    if (!conversation) {
      conversation = await this.conversations.save(where);
    }

    let message: Message | null = null;
    if (text?.trim()) {
      message = await this.messages.save({
        conversation_id: conversation.id,
        sender_role: viewerRole,
        text: text.trim(),
        flagged: false,
      });
      await this.touch(conversation.id);
    }

    const fresh = await this.conversations.findOne({
      where: { id: conversation.id },
      relations: viewerRole === 'client' ? { praticien: true } : { client: true },
    });
    return success({ conversation: fresh, message }, 'Conversation prête');
  }

  // ---- client ----

  async clientIndex(client: Client) {
    const rows = await this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.praticien', 'praticien')
      .where('c.client_id = :cid', { cid: client.id })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
    const withMeta = await Promise.all(rows.map((c) => this.withViewerMeta(c, 'client')));
    return success(withMeta);
  }

  async clientStore(client: Client, dto: CreateConversationClientDto) {
    const praticien = await this.praticiens.findOneBy({ id: dto.praticien_id });
    if (!praticien) this.notFound('Praticien introuvable');
    return this.storeFor('client', client.id, dto.praticien_id, dto.text);
  }

  async clientShow(client: Client, id: number) {
    const conversation = await this.conversations.findOne({
      where: { id, client_id: client.id },
      relations: { praticien: true },
    });
    if (!conversation) this.notFound('Conversation non trouvée');
    return success(await this.withViewerMeta(conversation, 'client'));
  }

  async clientMessages(client: Client, id: number) {
    const conversation = await this.conversations.findOneBy({ id, client_id: client.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    await this.markRead(id, 'praticien');
    const messages = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success(messages);
  }

  async clientSendMessage(client: Client, id: number, dto: SendMessageDto) {
    const conversation = await this.conversations.findOneBy({ id, client_id: client.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    const message = await this.messages.save({
      conversation_id: id, sender_role: 'client', text: dto.text.trim(), flagged: false,
    });
    await this.touch(id);
    return success(message, 'Message envoyé');
  }

  // ---- praticien ----

  async praticienIndex(praticien: Praticien) {
    const rows = await this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.client', 'client')
      .where('c.praticien_id = :pid', { pid: praticien.id })
      .orderBy('c.updated_at', 'DESC')
      .getMany();
    const withMeta = await Promise.all(rows.map((c) => this.withViewerMeta(c, 'praticien')));
    return success(withMeta);
  }

  async praticienStore(praticien: Praticien, dto: CreateConversationPraticienDto) {
    const client = await this.clients.findOneBy({ id: dto.client_id });
    if (!client) this.notFound('Client introuvable');
    return this.storeFor('praticien', praticien.id, dto.client_id, dto.text);
  }

  async praticienShow(praticien: Praticien, id: number) {
    const conversation = await this.conversations.findOne({
      where: { id, praticien_id: praticien.id },
      relations: { client: true },
    });
    if (!conversation) this.notFound('Conversation non trouvée');
    return success(await this.withViewerMeta(conversation, 'praticien'));
  }

  async praticienMessages(praticien: Praticien, id: number) {
    const conversation = await this.conversations.findOneBy({ id, praticien_id: praticien.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    await this.markRead(id, 'client');
    const messages = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success(messages);
  }

  async praticienSendMessage(praticien: Praticien, id: number, dto: SendMessageDto) {
    const conversation = await this.conversations.findOneBy({ id, praticien_id: praticien.id });
    if (!conversation) this.notFound('Conversation non trouvée');
    const message = await this.messages.save({
      conversation_id: id, sender_role: 'praticien', text: dto.text.trim(), flagged: false,
    });
    await this.touch(id);
    return success(message, 'Message envoyé');
  }

  // ---- admin ----

  async adminIndex(query: Record<string, any>) {
    const { page, perPage } = parsePagination(query, 15);
    const qb = this.conversations.createQueryBuilder('c')
      .leftJoinAndSelect('c.client', 'client')
      .leftJoinAndSelect('c.praticien', 'praticien')
      .orderBy('c.updated_at', 'DESC');
    const { data, pagination } = await paginateQb(qb, page, perPage);
    const withMeta = await Promise.all(data.map(async (c) => {
      const [last_message, message_count, flagged_count] = await Promise.all([
        this.lastMessageFor(c.id),
        this.messages.count({ where: { conversation_id: c.id } }),
        this.messages.count({ where: { conversation_id: c.id, flagged: true } }),
      ]);
      return { ...c, last_message, message_count, flagged_count };
    }));
    return success(withMeta, undefined, { pagination });
  }

  async adminShow(id: number) {
    const conversation = await this.conversations.findOne({
      where: { id },
      relations: { client: true, praticien: true },
    });
    if (!conversation) this.notFound('Conversation non trouvée');
    const messages = await this.messages.find({
      where: { conversation_id: id },
      order: { created_at: 'ASC' },
    });
    return success({ ...conversation, messages });
  }

  async flagMessage(id: number) {
    const message = await this.messages.findOneBy({ id });
    if (!message) this.notFound('Message non trouvé');
    await this.messages.update(id, { flagged: true });
    return success(await this.messages.findOneBy({ id }), 'Message signalé');
  }

  async unflagMessage(id: number) {
    const message = await this.messages.findOneBy({ id });
    if (!message) this.notFound('Message non trouvé');
    await this.messages.update(id, { flagged: false });
    return success(await this.messages.findOneBy({ id }), 'Signalement retiré');
  }
}
```

- [ ] **Step 5: Write the controller**

Create `server/src/conversations/conversations.controller.ts`:

```typescript
import {
  Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query, UseGuards,
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationClientDto } from './dto/create-conversation-client.dto';
import { CreateConversationPraticienDto } from './dto/create-conversation-praticien.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ClientGuard } from '../auth/guards/client.guard';
import { PraticienGuard } from '../auth/guards/praticien.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentClient, CurrentPraticien } from '../auth/decorators';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';

@Controller()
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  // ---- client ----

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/conversations')
  clientIndex(@CurrentClient() client: Client) {
    return this.service.clientIndex(client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('client/conversations')
  clientStore(@CurrentClient() client: Client, @Body() dto: CreateConversationClientDto) {
    return this.service.clientStore(client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/conversations/:id')
  clientShow(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.clientShow(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('client/conversations/:id/messages')
  clientMessages(@CurrentClient() client: Client, @Param('id', ParseIntPipe) id: number) {
    return this.service.clientMessages(client, id);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Post('client/conversations/:id/messages')
  clientSendMessage(
    @CurrentClient() client: Client,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.clientSendMessage(client, id, dto);
  }

  // ---- praticien ----

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/conversations')
  praticienIndex(@CurrentPraticien() praticien: Praticien) {
    return this.service.praticienIndex(praticien);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @HttpCode(200)
  @Post('praticien/conversations')
  praticienStore(@CurrentPraticien() praticien: Praticien, @Body() dto: CreateConversationPraticienDto) {
    return this.service.praticienStore(praticien, dto);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/conversations/:id')
  praticienShow(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.praticienShow(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Get('praticien/conversations/:id/messages')
  praticienMessages(@CurrentPraticien() praticien: Praticien, @Param('id', ParseIntPipe) id: number) {
    return this.service.praticienMessages(praticien, id);
  }

  @UseGuards(JwtAuthGuard, PraticienGuard)
  @Post('praticien/conversations/:id/messages')
  praticienSendMessage(
    @CurrentPraticien() praticien: Praticien,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendMessageDto,
  ) {
    return this.service.praticienSendMessage(praticien, id, dto);
  }

  // ---- admin ----

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/conversations')
  adminIndex(@Query() query: Record<string, any>) {
    return this.service.adminIndex(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('admin/conversations/:id')
  adminShow(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminShow(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/messages/:id/flag')
  flagMessage(@Param('id', ParseIntPipe) id: number) {
    return this.service.flagMessage(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('admin/messages/:id/unflag')
  unflagMessage(@Param('id', ParseIntPipe) id: number) {
    return this.service.unflagMessage(id);
  }
}
```

- [ ] **Step 6: Write the module and register it**

Create `server/src/conversations/conversations.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from '../database/entities/conversation.entity';
import { Message } from '../database/entities/message.entity';
import { Client } from '../database/entities/client.entity';
import { Praticien } from '../database/entities/praticien.entity';
import { ConversationsController } from './conversations.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Conversation, Message, Client, Praticien])],
  controllers: [ConversationsController],
  providers: [ConversationsService],
})
export class ConversationsModule {}
```

In `server/src/app.module.ts`, add the import and add `ConversationsModule` to the `imports` array (after `RendezVousModule`):

```typescript
import { ConversationsModule } from './conversations/conversations.module';
```

```typescript
    RendezVousModule,
    ConversationsModule,
```

- [ ] **Step 7: Run the spec to verify it passes**

Run: `npm run test:e2e -- conversations.e2e-spec.ts`
Expected: PASS (16 tests).

- [ ] **Step 8: Run the full e2e suite to check for regressions**

Run: `npm run test:e2e`
Expected: PASS (no other suite is affected).

- [ ] **Step 9: Commit**

```bash
git add server/src/conversations server/test/conversations.e2e-spec.ts server/src/app.module.ts
git commit -m "feat(server): add conversations module with client/praticien/admin endpoints"
```

---

## Task 4: Mobile — domain types, day-mark utility, repo layer

**Files:**
- Create: `mobile/src/utils/chatDayMarks.ts`, `mobile/src/utils/chatDayMarks.test.ts`
- Modify: `mobile/src/data/types.ts`, `mobile/src/utils/appendOptimisticMessage.ts`, `mobile/src/utils/appendOptimisticMessage.test.ts`, `mobile/src/data/repos/index.ts`
- Delete: `mobile/src/data/mock/messages.ts`

**Ground truth:** `mobile/src/data/repos/index.ts`'s `messageRepo` is currently 100% mock (`delay(conversationsMock)` / `delay(sampleChat(...))`), the only consumer of `mobile/src/data/mock/messages.ts`. `mobile/src/data/types.ts`'s `Conversation.kind: 'practitioner' | 'circle'` and `ChatMessage.proposal` are both dropped in this task (see Architecture notes) — every real conversation is client↔praticien, and no backend concept of an in-chat booking proposal exists. `ChatMessage.time` is a pre-formatted `"HH:MM"` display string with no date information, which is useless for day-boundary grouping — a new `createdAtIso: string` field carries the real timestamp through for that purpose.

- [ ] **Step 1: Write the failing test for `withDayMarks`**

Create `mobile/src/utils/chatDayMarks.test.ts`:

```typescript
import { withDayMarks } from './chatDayMarks';
import type { ChatMessage } from '../data/types';

const msg = (id: string, iso: string, text = 'hi'): ChatMessage => ({
  id, fromMe: false, text, time: '10:00', createdAtIso: iso,
});

describe('withDayMarks', () => {
  const now = new Date('2026-07-15T18:00:00.000Z');

  it('marks the first message of the list with a day label', () => {
    const result = withDayMarks([msg('1', '2026-07-15T09:00:00.000Z')], now);
    expect(result[0].dayMark).toBe("Aujourd'hui");
  });

  it('does not repeat the day label for consecutive same-day messages', () => {
    const result = withDayMarks([
      msg('1', '2026-07-15T09:00:00.000Z'),
      msg('2', '2026-07-15T10:00:00.000Z'),
    ], now);
    expect(result[0].dayMark).toBe("Aujourd'hui");
    expect(result[1].dayMark).toBeUndefined();
  });

  it('labels yesterday and older days distinctly', () => {
    const result = withDayMarks([
      msg('1', '2026-07-14T09:00:00.000Z'),
      msg('2', '2026-07-10T09:00:00.000Z'),
    ], now);
    expect(result[0].dayMark).toBe('Hier');
    expect(result[1].dayMark).toBe('10 juil.');
  });

  it('does not mutate the input array', () => {
    const input = [msg('1', '2026-07-15T09:00:00.000Z')];
    const result = withDayMarks(input, now);
    expect(result).not.toBe(input);
    expect(input[0].dayMark).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run (in `mobile/`): `npm test -- chatDayMarks`
Expected: FAIL — `Cannot find module './chatDayMarks'`.

- [ ] **Step 3: Implement `withDayMarks`**

Create `mobile/src/utils/chatDayMarks.ts`:

```typescript
import type { ChatMessage } from '../data/types';

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

// UTC getters throughout (not local getters): both real message timestamps
// (ISO strings from the server) and this function's test fixtures are UTC,
// so comparing on UTC calendar-day boundaries keeps this deterministic
// regardless of the host machine's local timezone.
function dayKey(d: Date): string {
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/**
 * Returns a copy of `messages` with `dayMark` set on the first message of
 * each calendar day ("Aujourd'hui" / "Hier" / "DD mon."), matching the
 * separators the chat UI has always shown. Pure and side-effect free so the
 * chat screen can call it on every render without maintaining extra state.
 */
export function withDayMarks(messages: ChatMessage[], now: Date = new Date()): ChatMessage[] {
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

  let lastKey: string | null = null;
  return messages.map((m) => {
    const created = new Date(m.createdAtIso);
    const key = dayKey(created);
    let dayMark: string | undefined;
    if (key !== lastKey) {
      dayMark = key === todayKey
        ? "Aujourd'hui"
        : key === yesterdayKey
          ? 'Hier'
          : `${created.getUTCDate()} ${MONTHS[created.getUTCMonth()]}`;
      lastKey = key;
    }
    return { ...m, dayMark };
  });
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- chatDayMarks`
Expected: PASS (4 tests).

- [ ] **Step 5: Update `mobile/src/data/types.ts`**

In `mobile/src/data/types.ts`, replace the `Conversation` and `ChatMessage` interfaces:

```typescript
export interface Conversation {
  id: string;
  name: string;
  avatar: readonly [string, string, ...string[]];
  photo?: import('react-native').ImageSourcePropType;
  preview: string;
  when: string;
  unread: boolean;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  fromMe: boolean;
  text: string;
  time: string;
  /** Real timestamp (ISO string) — `time` alone has no date, only "HH:MM". */
  createdAtIso: string;
  dayMark?: string;
}
```

(This removes `Conversation.kind` and `ChatMessage.proposal` — see the plan's Architecture notes for why both are dropped rather than kept or repurposed.)

- [ ] **Step 6: Update `appendOptimisticMessage` to carry `createdAtIso`**

In `mobile/src/utils/appendOptimisticMessage.ts`, update the returned object:

```typescript
import type { ChatMessage } from '../data/types';

/**
 * Appends a locally-composed message to the end of a message list, for
 * instant UI feedback while the real send request is in flight. The chat
 * screen clears this optimistic entry once the send mutation resolves and
 * the thread is refetched — see mobile/app/chat/[id].tsx.
 */
export function appendOptimisticMessage(
  messages: ChatMessage[],
  text: string,
  now: Date = new Date(),
): ChatMessage[] {
  const trimmed = text.trim();
  if (!trimmed) return messages;
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  return [
    ...messages,
    {
      id: `local-${now.getTime()}`,
      fromMe: true,
      text: trimmed,
      time: `${hh}:${mm}`,
      createdAtIso: now.toISOString(),
    },
  ];
}
```

- [ ] **Step 7: Fix the existing test fixture for the new required field**

In `mobile/src/utils/appendOptimisticMessage.test.ts`, update the `existing` fixture (the only change needed — the three assertions already use `toMatchObject`, which tolerates the new `createdAtIso` field on the result without modification):

```typescript
const existing: ChatMessage[] = [
  { id: 'c1', fromMe: false, text: 'Bonjour', time: '10:00', createdAtIso: '2026-07-13T09:00:00.000Z' },
];
```

- [ ] **Step 8: Run the utils test suite to verify no regressions**

Run: `npm test -- appendOptimisticMessage`
Expected: PASS (4 tests, unchanged assertions).

- [ ] **Step 9: Repoint `messageRepo` to the real backend and add `praticienMessageRepo`**

In `mobile/src/data/repos/index.ts`:

Remove the mock import (`import { conversationsMock, sampleChat } from '../mock/messages';`) and remove `Circle` from unused-if-any imports — leave the rest of the import block otherwise unchanged.

Replace the file's top comment block (currently states `messageRepo` reads mocks) with:

```typescript
/**
 * Repository layer — every screen reads through these functions.
 * disciplineRepo, practitionerRepo, eventRepo, cercleRepo, articleRepo,
 * exchangeRepo, paiementRepo, remboursementRepo, rendezVousRepo, avisRepo,
 * signalementRepo, favoriteRepo, and notificationPreferencesRepo all call the
 * real NestJS backend — the auth token is already attached globally by
 * `src/store/session.ts`'s `setToken`. messageRepo (client) and
 * praticienMessageRepo (praticien) also call the real backend now.
 */
```

Replace the `// ---------- Messaging ----------` section (currently the mock-backed `messageRepo`) with:

```typescript
// ---------- Messaging (real backend) ----------

function conversationTimestamp(row: any): string {
  return row.last_message?.created_at ?? row.updated_at ?? row.created_at;
}

export function mapConversationAsClient(row: any): Conversation {
  const p = row.praticien;
  return {
    id: String(row.id),
    name: p ? `${p.firstname} ${p.lastname}`.trim() : 'Praticien',
    avatar: DEFAULT_GRADIENT,
    photo: undefined,
    preview: row.last_message?.text ?? 'Démarrez la conversation…',
    when: dateFr(conversationTimestamp(row)),
    unread: (row.unread_count ?? 0) > 0,
    online: false,
  };
}

export function mapConversationAsPraticien(row: any): Conversation {
  const c = row.client;
  return {
    id: String(row.id),
    name: c ? `${c.firstname} ${c.lastname}`.trim() : 'Client',
    avatar: DEFAULT_GRADIENT,
    photo: undefined,
    preview: row.last_message?.text ?? 'Démarrez la conversation…',
    when: dateFr(conversationTimestamp(row)),
    unread: (row.unread_count ?? 0) > 0,
    online: false,
  };
}

export function mapMessage(row: any, viewerRole: 'client' | 'praticien'): ChatMessage {
  const d = new Date(row.created_at);
  const time = Number.isNaN(d.getTime())
    ? ''
    : `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return {
    id: String(row.id),
    fromMe: row.sender_role === viewerRole,
    text: row.text,
    time,
    createdAtIso: row.created_at,
  };
}

export const messageRepo = {
  conversations: (): Promise<Conversation[]> =>
    api.get<{ data: any[] }>('/client/conversations').then((res) => res.data.map(mapConversationAsClient)),
  conversation: (id: string): Promise<Conversation | undefined> =>
    api.get<{ data: any }>(`/client/conversations/${id}`).then((res) => mapConversationAsClient(res.data)).catch(() => undefined),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    api.get<{ data: any[] }>(`/client/conversations/${conversationId}/messages`)
      .then((res) => res.data.map((m) => mapMessage(m, 'client'))),
  send: (conversationId: string, text: string): Promise<ChatMessage> =>
    api.post<{ data: any }>(`/client/conversations/${conversationId}/messages`, { text })
      .then((res) => mapMessage(res.data, 'client')),
  // Creates (or reuses) the conversation with a praticien. No `text` here —
  // the caller lands on the chat screen and types the opening message there,
  // same flow as any other conversation. Used by praticien/[id].tsx's
  // "Contacter" button.
  startConversation: (praticienId: number): Promise<Conversation> =>
    api.post<{ data: { conversation: any } }>('/client/conversations', { praticien_id: praticienId })
      .then((res) => mapConversationAsClient(res.data.conversation)),
};

export const praticienMessageRepo = {
  conversations: (): Promise<Conversation[]> =>
    api.get<{ data: any[] }>('/praticien/conversations').then((res) => res.data.map(mapConversationAsPraticien)),
  conversation: (id: string): Promise<Conversation | undefined> =>
    api.get<{ data: any }>(`/praticien/conversations/${id}`).then((res) => mapConversationAsPraticien(res.data)).catch(() => undefined),
  messages: (conversationId: string): Promise<ChatMessage[]> =>
    api.get<{ data: any[] }>(`/praticien/conversations/${conversationId}/messages`)
      .then((res) => res.data.map((m) => mapMessage(m, 'praticien'))),
  send: (conversationId: string, text: string): Promise<ChatMessage> =>
    api.post<{ data: any }>(`/praticien/conversations/${conversationId}/messages`, { text })
      .then((res) => mapMessage(res.data, 'praticien')),
};
```

Add the `dateFr` import near the top of the file, alongside the other imports:

```typescript
import { dateFr } from '../../utils/format';
```

- [ ] **Step 10: Delete the now-unused mock file**

Verify nothing else imports it:

Run (in `mobile/`): `grep -rl "mock/messages" src app || echo "no other importers"`
Expected: `no other importers` (the only importer, `repos/index.ts`, no longer references it after Step 9).

```bash
git rm mobile/src/data/mock/messages.ts
```

- [ ] **Step 11: Run the mobile test suite and typecheck**

Run: `npm test` then `npm run typecheck`
Expected: Both PASS. (`messages.tsx`/`chat/[id].tsx` will not yet compile against the new repo shape until Tasks 5–6 — if `typecheck` fails on those two files specifically at this point, that is expected and resolved in Task 6; every other file should be clean.)

- [ ] **Step 12: Commit**

```bash
git add mobile/src/data/types.ts mobile/src/utils/chatDayMarks.ts mobile/src/utils/chatDayMarks.test.ts mobile/src/utils/appendOptimisticMessage.ts mobile/src/utils/appendOptimisticMessage.test.ts mobile/src/data/repos/index.ts mobile/src/data/mock/messages.ts
git commit -m "feat(mobile): repoint messageRepo to the real backend, add praticienMessageRepo"
```

---

## Task 5: Mobile — shared `ChatBubble` and `ChatComposer` components

**Files:**
- Create: `mobile/src/components/ChatBubble.tsx`, `mobile/src/components/ChatComposer.tsx`
- Modify: `mobile/src/components/Icon.tsx`

**Ground truth:** `mobile/src/components/` has no chat-related components today — the bubble and composer markup live inline in `mobile/app/chat/[id].tsx`'s `Bubble` function and the `KeyboardAvoidingView`'s bottom row. Both the client chat screen (Task 6) and the new praticien chat screen (Task 8) need the identical visual bubble/composer; extracting them here avoids duplicating ~80 lines of styling twice.

- [ ] **Step 1: Add a `'message'` icon case**

In `mobile/src/components/Icon.tsx`, add `'message'` to the `IconName` union:

```typescript
export type IconName =
  | 'back'
  | 'close'
  | 'search'
  | 'heart'
  | 'share'
  | 'flag'
  | 'pin'
  | 'video'
  | 'inperson'
  | 'shield'
  | 'send'
  | 'chevron'
  | 'check'
  | 'plus'
  | 'filter'
  | 'sun'
  | 'status'
  | 'bell'
  | 'card'
  | 'cal'
  | 'exchange'
  | 'star'
  | 'message';
```

Add a `'message'` case to the `switch` (after the `'star'` case), reusing the exact path the tab bar's inline message-bubble icon already draws (`mobile/app/(tabs)/_layout.tsx`):

```typescript
    case 'message':
      return (
        <Svg {...common}>
          <Path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </Svg>
      );
```

- [ ] **Step 2: Write `ChatBubble`**

Create `mobile/src/components/ChatBubble.tsx`:

```tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import type { ChatMessage } from '@data/types';

/**
 * Single chat message bubble, shared by the client and praticien chat
 * screens (mobile/app/chat/[id].tsx and mobile/app/praticien-messages/[id].tsx)
 * — the visual message representation doesn't vary by role, only which
 * messages count as "mine" does (ChatMessage.fromMe, set by the caller's
 * mapping layer — see mobile/src/data/repos/index.ts's mapMessage).
 */
export function ChatBubble({ message }: { message: ChatMessage }) {
  return (
    <>
      {message.dayMark ? <Text style={styles.dayMark}>{message.dayMark.toUpperCase()}</Text> : null}
      <View style={[styles.bubble, message.fromMe ? styles.me : styles.them]}>
        <Text style={[styles.bubbleTxt, message.fromMe && { color: '#fff' }]}>
          {message.text}
        </Text>
        <Text
          style={[
            styles.bubbleMeta,
            message.fromMe ? { color: 'rgba(255,255,255,0.55)' } : null,
          ]}
        >
          {message.time}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: '78%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  them: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    borderBottomLeftRadius: 6,
  },
  me: {
    alignSelf: 'flex-end',
    backgroundColor: colors.ink,
    borderBottomRightRadius: 6,
  },
  bubbleTxt: { ...typography.body, fontSize: 14, lineHeight: 20 },
  bubbleMeta: { ...typography.tiny, fontSize: 10, marginTop: 4, textAlign: 'right' },
  dayMark: {
    ...typography.tiny,
    textAlign: 'center',
    letterSpacing: 2,
    marginVertical: 4,
  },
});
```

- [ ] **Step 3: Write `ChatComposer`**

Create `mobile/src/components/ChatComposer.tsx`:

```tsx
import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';
import { Icon } from './Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Text input + send button row, shared by the client and praticien chat
 * screens. `containerStyle` lets each screen apply its own bottom safe-area
 * inset without duplicating the row's layout styles.
 */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  placeholder = 'Votre message…',
  containerStyle,
}: Props) {
  return (
    <View style={[styles.compose, containerStyle]}>
      <Pressable style={styles.composeIcon}>
        <Icon name="plus" size={20} color={colors.muted} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        style={styles.composeInput}
      />
      <Pressable style={styles.sendBtn} onPress={onSend}>
        <Icon name="send" size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: 'rgba(251,249,246,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  composeIcon: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composeInput: {
    flex: 1,
    height: 44,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.line,
    ...typography.body,
    color: colors.ink,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 4: Run typecheck**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS for these two new files (existing failures in `chat/[id].tsx`, if any remain from Task 4, are resolved in Task 6).

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/ChatBubble.tsx mobile/src/components/ChatComposer.tsx mobile/src/components/Icon.tsx
git commit -m "feat(mobile): extract shared ChatBubble and ChatComposer components"
```

---

## Task 6: Mobile — client Messages list + Chat screen repointed to real data

**Files:**
- Modify: `mobile/app/(tabs)/messages.tsx`, `mobile/app/chat/[id].tsx`

**Ground truth:** react-query's `refetchInterval` only applies to the message-thread query, not the conversation-list query — this matches the design spec's wording ("poll ... while a chat screen is mounted") and this codebase's existing convention that list screens don't poll (`avis`, `favorites`, etc. all rely on the global 30s `staleTime` default). 6000ms is chosen for the poll interval: frequent enough that a chat feels reasonably live, infrequent enough not to hammer the backend; it only runs while the thread's query is mounted (React Query stops polling once a query unmounts, i.e. once the user navigates away from the chat screen).

- [ ] **Step 1: Rewrite `mobile/app/(tabs)/messages.tsx`**

Replace the full contents of `mobile/app/(tabs)/messages.tsx`:

```tsx
import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Chip } from '@components/Chip';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { messageRepo } from '@data/repos';

export default function Messages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['conversations'],
    queryFn: messageRepo.conversations,
  });

  const filtered = list.filter((c) => {
    if (filter === 'unread' && !c.unread) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.head}>
          <Text style={styles.h1}>Messages</Text>
          {/* Starting a conversation begins from a praticien's profile (the
              "Contacter" button, wired in Task 7) — this "+" routes to
              search/browse rather than duplicating a contact-picker UI. */}
          <Pressable style={styles.plusBtn} onPress={() => router.push('/(tabs)/recherche' as any)}>
            <Icon name="plus" size={20} color={colors.ink} />
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: 20 }}>
          <Input
            leftIcon={<Icon name="search" size={18} color={colors.muted} />}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher dans les messages…"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 14 }}
        >
          <Chip label="Tous" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Non lus" active={filter === 'unread'} onPress={() => setFilter('unread')} />
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.emptyBody}>
                Contactez un praticien depuis son profil pour démarrer une conversation.
              </Text>
            </View>
          ) : (
            filtered.map((c) => (
              <Pressable
                key={c.id}
                style={styles.row}
                onPress={() => router.push(`/chat/${c.id}` as any)}
              >
                <Avatar source={c.photo} gradient={c.avatar} size="md" online={c.online} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text
                      style={[
                        styles.when,
                        c.unread && { color: colors.violet2, fontFamily: 'Outfit_500Medium' },
                      ]}
                    >
                      {c.when}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.preview,
                      c.unread && { color: colors.ink, fontFamily: 'Outfit_500Medium' },
                    ]}
                    numberOfLines={1}
                  >
                    {c.preview}
                  </Text>
                </View>
                {c.unread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))
          )}
        </View>

        <View style={styles.safetyCard}>
          <View style={styles.safetyIc}>
            <Icon name="shield" size={18} color={colors.ink} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.safetyTitle}>Avant la séance</Text>
            <Text style={styles.safetyBody}>
              Posez vos questions ici. Les paiements ne se font jamais en privé.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  h1: { ...typography.h1 },
  plusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.mist,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: { ...typography.bodyMedium, fontSize: 15 },
  when: { ...typography.tiny, fontSize: 11 },
  preview: { ...typography.small, fontSize: 13 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet2,
  },
  emptyWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 6 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 13, textAlign: 'center' },
  safetyCard: {
    marginHorizontal: 20,
    marginTop: 24,
    padding: 18,
    borderRadius: 20,
    backgroundColor: '#EFE6F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  safetyIc: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safetyTitle: {
    fontFamily: 'CormorantGaramond_500Medium',
    fontSize: 16,
  },
  safetyBody: { ...typography.tiny, fontSize: 12, lineHeight: 17 },
});
```

- [ ] **Step 2: Rewrite `mobile/app/chat/[id].tsx`**

Replace the full contents of `mobile/app/chat/[id].tsx`:

```tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { ChatBubble } from '@components/ChatBubble';
import { ChatComposer } from '@components/ChatComposer';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { messageRepo } from '@data/repos';
import type { ChatMessage } from '@data/types';
import { appendOptimisticMessage } from '@utils/appendOptimisticMessage';
import { withDayMarks } from '@utils/chatDayMarks';

// While this screen is mounted, messages are polled rather than pushed —
// there is no WebSocket infra in this codebase (Plan 08 design spec,
// decision P8-1). 6s keeps a chat feeling reasonably live without hammering
// the backend; it only runs while this screen is focused (React Query stops
// polling once the query is unmounted, e.g. on navigating back).
const POLL_INTERVAL_MS = 6000;

export default function Chat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const { data: conv } = useQuery({
    queryKey: ['conversation', id],
    queryFn: () => messageRepo.conversation(String(id)),
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ['messages', id],
    queryFn: () => messageRepo.messages(String(id)),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const allMsgs = useMemo(() => withDayMarks([...msgs, ...pending]), [msgs, pending]);

  const sendMutation = useMutation({
    mutationFn: (value: string) => messageRepo.send(String(id), value),
    onSuccess: () => {
      setPending([]);
      queryClient.invalidateQueries({ queryKey: ['messages', id] });
    },
  });

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPending((prev) => appendOptimisticMessage(prev, trimmed));
    setText('');
    sendMutation.mutate(trimmed);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.pearl }}
    >
      <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="back" size={20} color={colors.ink} />
        </Pressable>
        <Avatar source={conv?.photo} gradient={conv?.avatar ?? [colors.violet, colors.sky]} size="sm" online={conv?.online} />
        <View style={{ flex: 1 }}>
          <Text style={styles.who}>{conv?.name ?? 'Conversation'}</Text>
          <Text style={styles.status}>{conv?.online ? '● En ligne' : 'Praticien'}</Text>
        </View>
      </View>

      <LinearGradient colors={[colors.pearl, '#F6F1EA']} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {allMsgs.length === 0 ? (
            <Text style={styles.empty}>Écrivez le premier message de cette conversation.</Text>
          ) : (
            allMsgs.map((m) => <ChatBubble key={m.id} message={m} />)
          )}
        </ScrollView>
      </LinearGradient>

      <ChatComposer
        value={text}
        onChangeText={setText}
        onSend={send}
        containerStyle={{ paddingBottom: insets.bottom + 10 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  who: { ...typography.bodyMedium, fontSize: 15 },
  status: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.sage2 },
  empty: { ...typography.small, textAlign: 'center', marginTop: 40 },
});
```

Note: the previous "video call" header icon is dropped along with the mock's `proposal` bubble — both were decorative affordances for features (video calling, in-chat booking proposals) that have no backend concept anywhere in this codebase and are out of scope for this plan.

- [ ] **Step 3: Run typecheck and the mobile test suite**

Run (in `mobile/`): `npm run typecheck` then `npm test`
Expected: Both PASS.

- [ ] **Step 4: Commit**

```bash
git add mobile/app/\(tabs\)/messages.tsx mobile/app/chat/\[id\].tsx
git commit -m "feat(mobile): wire client messages list and chat screen to the real backend"
```

---

## Task 7: Mobile — "Contacter" entry point on the praticien profile

**Files:**
- Modify: `mobile/app/praticien/[id].tsx`

- [ ] **Step 1: Add a real "Contacter" flow**

In `mobile/app/praticien/[id].tsx`, update the repo import to also pull in `messageRepo`:

```typescript
import { practitionerRepo, favoriteRepo, messageRepo } from '@data/repos';
```

Add a `contactPending`/`contactError` state pair alongside the existing `favPending`/`favError` state (near the top of the component body):

```typescript
  const [contactPending, setContactPending] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
```

Add a `startChat` handler alongside the existing `toggleFavorite` handler:

```typescript
  const startChat = async () => {
    if (contactPending) return;
    setContactPending(true);
    setContactError(null);
    try {
      const conversation = await messageRepo.startConversation(Number(id));
      router.push(`/chat/${conversation.id}` as any);
    } catch (err: any) {
      setContactError(err?.message ?? 'Impossible de démarrer la conversation, réessayez.');
    } finally {
      setContactPending(false);
    }
  };
```

Update the error banner near the top of the floating card to show either error (it's the same visual treatment, just now covering two independent actions):

```tsx
          {(favError || contactError) ? <Text style={styles.favError}>{favError || contactError}</Text> : null}
```

Replace the "Contacter" button in the bottom dock:

```tsx
        <Button
          label={contactPending ? 'Un instant…' : 'Contacter'}
          variant="soft"
          onPress={startChat}
          disabled={contactPending}
          style={{ flex: 1 }}
        />
```

- [ ] **Step 2: Run typecheck**

Run (in `mobile/`): `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add mobile/app/praticien/\[id\].tsx
git commit -m "feat(mobile): wire the praticien profile's Contacter button to a real conversation"
```

---

## Task 8: Mobile — praticien-side messaging screens + dashboard entry point

**Files:**
- Create: `mobile/app/praticien-messages/index.tsx`, `mobile/app/praticien-messages/[id].tsx`
- Modify: `mobile/app/dashboard.tsx`, `mobile/app/_layout.tsx`

**Ground truth:** non-tab, stack-pushed list screens in this codebase use `<ScreenHeader title="..." />` for their back-navigable header (see `mobile/app/favorites.tsx`, added by Plan 07) rather than the tab-style custom header `(tabs)/messages.tsx` uses — that convention is followed here for the praticien conversation list. The praticien chat *thread* screen mirrors `chat/[id].tsx`'s own specialised chat header exactly (avatar + name + status row), since that header design is intrinsic to a chat screen, not tied to the tab-vs-stack distinction.

- [ ] **Step 1: Write the praticien conversation list**

Create `mobile/app/praticien-messages/index.tsx`:

```tsx
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { Chip } from '@components/Chip';
import { Icon } from '@components/Icon';
import { Input } from '@components/Input';
import { ScreenHeader } from '@components/ScreenHeader';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienMessageRepo } from '@data/repos';

export default function PraticienMessages() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [search, setSearch] = useState('');

  const { data: list = [] } = useQuery({
    queryKey: ['praticien-conversations'],
    queryFn: praticienMessageRepo.conversations,
  });

  const filtered = list.filter((c) => {
    if (filter === 'unread' && !c.unread) return false;
    if (search.trim() && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <View style={{ flex: 1, backgroundColor: colors.pearl }}>
      <ScreenHeader title="Mes messages" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 20, paddingTop: 4 }}>
          <Input
            leftIcon={<Icon name="search" size={18} color={colors.muted} />}
            value={search}
            onChangeText={setSearch}
            placeholder="Rechercher un client…"
            containerStyle={{ marginBottom: 0 }}
          />
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8, marginTop: 14 }}
        >
          <Chip label="Tous" active={filter === 'all'} onPress={() => setFilter('all')} />
          <Chip label="Non lus" active={filter === 'unread'} onPress={() => setFilter('unread')} />
        </ScrollView>

        <View style={{ marginTop: 8 }}>
          {filtered.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>Aucune conversation</Text>
              <Text style={styles.emptyBody}>
                Les clients qui vous contactent apparaîtront ici.
              </Text>
            </View>
          ) : (
            filtered.map((c) => (
              <Pressable
                key={c.id}
                style={styles.row}
                onPress={() => router.push(`/praticien-messages/${c.id}` as any)}
              >
                <Avatar source={c.photo} gradient={c.avatar} size="md" online={c.online} />
                <View style={{ flex: 1 }}>
                  <View style={styles.rowTop}>
                    <Text style={styles.name}>{c.name}</Text>
                    <Text
                      style={[
                        styles.when,
                        c.unread && { color: colors.violet2, fontFamily: 'Outfit_500Medium' },
                      ]}
                    >
                      {c.when}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.preview,
                      c.unread && { color: colors.ink, fontFamily: 'Outfit_500Medium' },
                    ]}
                    numberOfLines={1}
                  >
                    {c.preview}
                  </Text>
                </View>
                {c.unread ? <View style={styles.unreadDot} /> : null}
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  name: { ...typography.bodyMedium, fontSize: 15 },
  when: { ...typography.tiny, fontSize: 11 },
  preview: { ...typography.small, fontSize: 13 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet2,
  },
  emptyWrap: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 6 },
  emptyTitle: { fontFamily: 'CormorantGaramond_500Medium', fontSize: 18, color: colors.ink },
  emptyBody: { ...typography.small, fontSize: 13, textAlign: 'center' },
});
```

- [ ] **Step 2: Write the praticien chat thread**

Create `mobile/app/praticien-messages/[id].tsx`:

```tsx
import React, { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@components/Avatar';
import { ChatBubble } from '@components/ChatBubble';
import { ChatComposer } from '@components/ChatComposer';
import { Icon } from '@components/Icon';
import { colors } from '@theme/colors';
import { typography } from '@theme/typography';
import { praticienMessageRepo } from '@data/repos';
import type { ChatMessage } from '@data/types';
import { appendOptimisticMessage } from '@utils/appendOptimisticMessage';
import { withDayMarks } from '@utils/chatDayMarks';

const POLL_INTERVAL_MS = 6000;

export default function PraticienChat() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [pending, setPending] = useState<ChatMessage[]>([]);
  const scrollRef = useRef<ScrollView>(null);

  const { data: conv } = useQuery({
    queryKey: ['praticien-conversation', id],
    queryFn: () => praticienMessageRepo.conversation(String(id)),
  });
  const { data: msgs = [] } = useQuery({
    queryKey: ['praticien-messages', id],
    queryFn: () => praticienMessageRepo.messages(String(id)),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const allMsgs = useMemo(() => withDayMarks([...msgs, ...pending]), [msgs, pending]);

  const sendMutation = useMutation({
    mutationFn: (value: string) => praticienMessageRepo.send(String(id), value),
    onSuccess: () => {
      setPending([]);
      queryClient.invalidateQueries({ queryKey: ['praticien-messages', id] });
    },
  });

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPending((prev) => appendOptimisticMessage(prev, trimmed));
    setText('');
    sendMutation.mutate(trimmed);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: colors.pearl }}
    >
      <View style={[styles.head, { paddingTop: insets.top + 6 }]}>
        <Pressable onPress={() => router.back()} style={styles.iconBtn}>
          <Icon name="back" size={20} color={colors.ink} />
        </Pressable>
        <Avatar source={conv?.photo} gradient={conv?.avatar ?? [colors.violet, colors.sky]} size="sm" online={conv?.online} />
        <View style={{ flex: 1 }}>
          <Text style={styles.who}>{conv?.name ?? 'Conversation'}</Text>
          <Text style={styles.status}>Client</Text>
        </View>
      </View>

      <LinearGradient colors={[colors.pearl, '#F6F1EA']} style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 10 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {allMsgs.length === 0 ? (
            <Text style={styles.empty}>Écrivez le premier message de cette conversation.</Text>
          ) : (
            allMsgs.map((m) => <ChatBubble key={m.id} message={m} />)
          )}
        </ScrollView>
      </LinearGradient>

      <ChatComposer
        value={text}
        onChangeText={setText}
        onSend={send}
        containerStyle={{ paddingBottom: insets.bottom + 10 }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  who: { ...typography.bodyMedium, fontSize: 15 },
  status: { fontFamily: 'Outfit_500Medium', fontSize: 11, color: colors.sage2 },
  empty: { ...typography.small, textAlign: 'center', marginTop: 40 },
});
```

- [ ] **Step 3: Add a real "Mes messages" row to the praticien dashboard**

In `mobile/app/dashboard.tsx`, add imports:

```typescript
import { useQuery } from '@tanstack/react-query';
import { praticienMessageRepo } from '@data/repos';
```

Inside the component body, after the existing `useSession` hooks:

```typescript
  const { data: conversations = [] } = useQuery({
    queryKey: ['praticien-conversations'],
    queryFn: praticienMessageRepo.conversations,
  });
  const unreadCount = conversations.filter((c) => c.unread).length;
```

Add a new `<Row>` between the existing "Mes échanges" and "Revenus & virements" rows:

```tsx
        <Row
          icon={<Icon name="message" size={20} color={colors.ink} />}
          title="Mes messages"
          sub={unreadCount > 0 ? `${unreadCount} non lu${unreadCount > 1 ? 's' : ''}` : 'Aucun nouveau message'}
          onPress={() => router.push('/praticien-messages' as any)}
        />
```

- [ ] **Step 4: Register the two new screens**

In `mobile/app/_layout.tsx`, add two `Stack.Screen` entries after `dashboard`:

```tsx
              <Stack.Screen name="dashboard" />
              <Stack.Screen name="praticien-messages/index" />
              <Stack.Screen name="praticien-messages/[id]" />
              <Stack.Screen name="subscription" />
```

- [ ] **Step 5: Run typecheck and the mobile test suite**

Run (in `mobile/`): `npm run typecheck` then `npm test`
Expected: Both PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/app/praticien-messages mobile/app/dashboard.tsx mobile/app/_layout.tsx
git commit -m "feat(mobile): add praticien-side messaging screens off the dashboard"
```

---

## Task 9: Web — client `compte/messages` + `compte/message/[id]` repointed

**Files:**
- Create: `web/app/(site)/compte/messages/MessagesList.jsx`
- Modify: `web/app/(site)/compte/messages/page.jsx`, `web/app/(site)/compte/message/[id]/page.jsx`

**Ground truth:** matches the extraction pattern Plan 07 used for `compte/avis` — `page.jsx` stays a thin server component (keeps its `metadata` export), a new `'use client'` sibling component owns the data fetching. `compte/message/[id]/page.jsx` currently has `generateStaticParams`/`generateMetadata` (built for a static mock array) — per the precedent set by `web/app/(site)/praticien/[id]/page.jsx` (Plan 07, real backend data), both are dropped and the whole page becomes a `'use client'` component using `use(params)` + `useQuery`, since conversation names aren't statically enumerable from a real database.

- [ ] **Step 1: Write `MessagesList.jsx`**

Create `web/app/(site)/compte/messages/MessagesList.jsx`:

```jsx
'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

const FILTERS = [
  { key: 'all', label: 'Tous' },
  { key: 'unread', label: 'Non lus' },
];

export default function MessagesList() {
  const [filter, setFilter] = useState('all');
  const { data: res, isLoading } = useQuery({
    queryKey: ['client-conversations'],
    queryFn: () => api.get('/client/conversations'),
  });
  const conversations = res?.data ?? [];
  const filtered = filter === 'unread' ? conversations.filter((c) => c.unread_count > 0) : conversations;

  return (
    <>
      <div className="row gap-2 wrap">
        {FILTERS.map((f) => (
          <span
            key={f.key}
            className={`chip ${filter === f.key ? 'active' : ''}`}
            onClick={() => setFilter(f.key)}
            style={{ cursor: 'pointer' }}
          >
            {f.label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <div className="empty">Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <Icon name="message" size={28} color="var(--muted)" />
          <p className="mt-2">Aucune conversation pour l'instant. Contactez un praticien depuis son profil pour démarrer.</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {filtered.map((c, i) => {
            const name = c.praticien ? `${c.praticien.firstname} ${c.praticien.lastname}` : 'Praticien';
            const unread = (c.unread_count ?? 0) > 0;
            return (
              <Link
                key={c.id}
                href={`/compte/message/${c.id}`}
                className="row gap-3 card-hover"
                style={{ padding: '16px 18px', borderTop: i ? '1px solid var(--line)' : 'none', alignItems: 'center' }}
              >
                <Avatar name={name} tone="violet" size={48} />
                <div className="flex-1" style={{ minWidth: 0 }}>
                  <div className="between">
                    <span className="h-4" style={{ fontWeight: unread ? 600 : 500 }}>{name}</span>
                    <span className="tiny muted">{dateFr(c.last_message?.created_at ?? c.updated_at)}</span>
                  </div>
                  <div className="row gap-2">
                    <span
                      className="small flex-1"
                      style={{
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: unread ? 'var(--ink)' : 'var(--muted)',
                      }}
                    >
                      {c.last_message?.text ?? 'Démarrez la conversation…'}
                    </span>
                    {unread && <span style={{ width: 9, height: 9, borderRadius: 99, background: 'var(--violet-2)', flexShrink: 0 }} />}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      <div className="panel">
        <div className="row gap-2 mb-2">
          <Icon name="shield" size={16} color="var(--violet-2)" />
          <span className="h-4" style={{ fontWeight: 500 }}>Avant la séance</span>
        </div>
        <p className="small">
          Pour votre sécurité, gardez vos échanges et paiements sur AURA. Un praticien ne vous demandera jamais de régler en dehors de la plateforme ni de communiquer vos coordonnées bancaires. En cas de doute, <Link className="more" href="/aide">signalez-le nous</Link>.
        </p>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Repoint `page.jsx` to render it**

Replace the full contents of `web/app/(site)/compte/messages/page.jsx`:

```jsx
import MessagesList from './MessagesList';

export const metadata = { title: 'Messages — AURA' };

export default function MessagesPage() {
  return (
    <div className="stack gap-5">
      <header className="reveal r-1">
        <h1 className="h-1">Messages</h1>
        <p className="lead" style={{ marginTop: 4 }}>Échangez avec vos praticiens, <span className="serif italic accent">en toute sérénité</span>.</p>
      </header>

      <MessagesList />
    </div>
  );
}
```

- [ ] **Step 3: Rewrite the conversation detail page as a client component**

Replace the full contents of `web/app/(site)/compte/message/[id]/page.jsx`:

```jsx
'use client';
import { use, useState } from 'react';
import Link from 'next/link';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar } from '@/components/ui/Avatar';
import { Icon } from '@/components/ui/Icon';
import { ModalButton } from '@/components/ui/ModalButton';
import { api } from '@/lib/api';

// Same polling cadence as the mobile chat screen (mobile/app/chat/[id].tsx)
// — no WebSocket infra exists in this codebase (Plan 08 design spec, P8-1).
const POLL_INTERVAL_MS = 6000;

export default function ConversationPage({ params }) {
  const { id } = use(params);
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: convRes, isLoading: convLoading } = useQuery({
    queryKey: ['client-conversation', id],
    queryFn: () => api.get(`/client/conversations/${id}`),
  });
  const { data: msgRes } = useQuery({
    queryKey: ['client-messages', id],
    queryFn: () => api.get(`/client/conversations/${id}/messages`),
    refetchInterval: POLL_INTERVAL_MS,
  });
  const conv = convRes?.data;
  const messages = msgRes?.data ?? [];

  const sendMutation = useMutation({
    mutationFn: (value) => api.post(`/client/conversations/${id}/messages`, { text: value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['client-messages', id] }),
  });

  const send = (e) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    setText('');
    sendMutation.mutate(trimmed);
  };

  if (!convLoading && !conv) {
    return (
      <div className="stack gap-4">
        <p className="lead">Conversation introuvable.</p>
        <Link href="/compte/messages" className="btn btn-soft">Retour aux messages</Link>
      </div>
    );
  }
  if (!conv) return null;

  const name = conv.praticien ? `${conv.praticien.firstname} ${conv.praticien.lastname}` : 'Praticien';

  return (
    <div className="stack gap-4">
      <nav className="crumbs">
        <Link href="/compte/messages">Messages</Link>
        <Icon name="chevronRight" size={13} color="var(--muted)" />
        <span>{name}</span>
      </nav>

      <div className="card" style={{ overflow: 'hidden' }}>
        {/* Header */}
        <div className="row gap-3 between" style={{ padding: '14px 18px', borderBottom: '1px solid var(--line)' }}>
          <div className="row gap-3">
            <Avatar name={name} tone="violet" size={44} />
            <div>
              <div className="h-4" style={{ fontWeight: 500 }}>{name}</div>
              <div className="tiny muted">Praticien</div>
            </div>
          </div>
          <ModalButton modal="report" payload={{ name }} className="btn btn-icon btn-ghost" title="Signaler">
            <Icon name="flag" size={16} />
          </ModalButton>
        </div>

        {/* Messages */}
        <div className="stack gap-3" style={{ padding: '20px 18px', background: 'var(--pearl)' }}>
          {messages.length === 0 ? (
            <p className="small muted center">Écrivez le premier message de cette conversation.</p>
          ) : messages.map((m) => (
            <div key={m.id} className="stack gap-1" style={{ alignItems: m.sender_role === 'client' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '78%', padding: '10px 14px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                background: m.sender_role === 'client' ? 'var(--ink)' : '#fff',
                color: m.sender_role === 'client' ? '#fff' : 'var(--ink)',
                borderBottomRightRadius: m.sender_role === 'client' ? 4 : 16,
                borderBottomLeftRadius: m.sender_role === 'client' ? 16 : 4,
                border: m.sender_role === 'client' ? 'none' : '1px solid var(--line)',
              }}>
                {m.text}
              </div>
              <span className="tiny muted">
                {new Date(m.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}
        </div>

        {/* Composer */}
        <form onSubmit={send} className="row gap-2" style={{ padding: '12px 14px', borderTop: '1px solid var(--line)' }}>
          <input className="input flex-1" placeholder="Écrire un message…" value={text} onChange={(e) => setText(e.target.value)} />
          <button type="submit" className="btn btn-primary btn-icon" title="Envoyer" disabled={sendMutation.isPending}>
            <Icon name="arrowRight" size={18} color="#fff" />
          </button>
        </form>
      </div>

      <div className="note">
        <Icon name="shield" size={15} color="var(--violet-2)" /> Réglez toujours vos séances via AURA. Ne communiquez jamais vos coordonnées bancaires par message.
      </div>
    </div>
  );
}
```

Note: this drops the mock's `Proposal` in-chat booking-slot card, matching the same "no backend concept, out of scope" decision made for mobile in Task 6.

- [ ] **Step 4: Run the web build**

Run (in `web/`): `npm run build`
Expected: Build succeeds — no static-generation errors from the dropped `generateStaticParams`, no route-shape errors.

- [ ] **Step 5: Commit**

```bash
git add web/app/\(site\)/compte/messages web/app/\(site\)/compte/message
git commit -m "feat(web): wire compte/messages and compte/message/[id] to the real API"
```

---

## Task 10: Web — `admin/messages` + `admin/message/[id]` with flag/unflag

**Files:**
- Modify: `web/app/admin/messages/page.jsx`, `web/app/admin/message/[id]/page.jsx`

**Ground truth:** the mock's `kind`/`cercle` column and filter are removed (see Task 4's Architecture notes — no conversation is ever "cercle" for real). The mock's decorative "Avertir les participants" / "Suspendre un compte" / "Marquer comme résolu" sidebar actions have no real backend concept in this plan's schema (no conversation-level moderation status, no account-suspension endpoint — those belong to different, not-yet-built parts of Plan 08 or later) and are removed rather than left wired to fake toasts; they are replaced with the one moderation action that **is** in scope and does have a real backend: per-message flag/unflag.

- [ ] **Step 1: Rewrite `admin/messages/page.jsx`**

Replace the full contents of `web/app/admin/messages/page.jsx`:

```jsx
'use client';
import { useQuery } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { DataTable } from '@/components/ui/DataTable';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function AdminMessagesPage() {
  const { data: res } = useQuery({
    queryKey: ['admin-conversations'],
    queryFn: () => api.get('/admin/conversations?per_page=100'),
  });
  const rows = (res?.data ?? []).map((c) => ({
    ...c,
    moderation_state: c.flagged_count > 0 ? 'signalé' : 'sain',
    client_name: c.client ? `${c.client.firstname} ${c.client.lastname}` : 'Client',
    praticien_name: c.praticien ? `${c.praticien.firstname} ${c.praticien.lastname}` : 'Praticien',
  }));
  const flagged = rows.filter((c) => c.flagged_count > 0).length;

  const columns = [
    {
      key: 'name', label: 'Conversation',
      render: (c) => (
        <div className="row gap-2">
          <Avatar name={c.client_name} size={32} tone="sky" />
          <div>
            <div className="table-cell-main">{c.client_name} <span className="tiny muted">↔</span> {c.praticien_name}</div>
            <div className="tiny">{c.message_count} message{c.message_count > 1 ? 's' : ''}</div>
          </div>
        </div>
      ),
    },
    { key: 'preview', label: 'Dernier message', render: (c) => <span className="small" style={{ display: 'block', maxWidth: 340 }}>{c.last_message?.text ?? '—'}</span> },
    { key: 'when', label: 'Activité', width: 100, render: (c) => <span className="tiny">{dateFr(c.last_message?.created_at ?? c.updated_at)}</span> },
    {
      key: 'moderation_state', label: 'État', width: 130,
      render: (c) => c.flagged_count > 0
        ? <Badge variant="danger" dot>{c.flagged_count} signalé{c.flagged_count > 1 ? 's' : ''}</Badge>
        : <Badge variant="success">sain</Badge>,
    },
    { key: 'go', label: '', width: 50, render: () => <Icon name="chevronRight" size={16} color="var(--muted)" /> },
  ];

  return (
    <>
      <PageHead
        title="Surveillance des messages"
        subtitle={`${rows.length} conversation${rows.length > 1 ? 's' : ''} · ${flagged} en revue`}
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Modération' }, { label: 'Messages' }]}
      />

      <div className="note tint-violet" style={{ marginBottom: 22 }}>
        <div className="row gap-2"><Icon name="shield" size={16} color="var(--violet-2)" /><strong>Confidentialité & sécurité.</strong></div>
        <p className="small" style={{ marginTop: 6 }}>
          L'accès au contenu des conversations est <span className="serif italic accent">strictement réservé</span> à la modération. Il n'est ouvert qu'en cas de signalement ou de suspicion de paiement hors plateforme.
        </p>
      </div>

      <DataTable
        columns={columns}
        rows={rows}
        searchKeys={['client_name', 'praticien_name']}
        filters={[
          { key: 'moderation_state', label: 'Tous les états', options: [
            { value: 'signalé', label: 'Signalé' },
            { value: 'sain', label: 'Sain' },
          ] },
        ]}
        rowHref={(c) => `/admin/message/${c.id}`}
        searchPlaceholder="Rechercher une conversation…"
        pageSize={10}
      />
    </>
  );
}
```

- [ ] **Step 2: Rewrite `admin/message/[id]/page.jsx`**

Replace the full contents of `web/app/admin/message/[id]/page.jsx`:

```jsx
'use client';
import { use } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { api } from '@/lib/api';
import { dateFr } from '@/lib/format';

export default function AdminConversationPage({ params }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ['admin-conversation', id],
    queryFn: () => api.get(`/admin/conversations/${id}`),
  });
  const conv = res?.data;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-conversation', id] });

  const flagMutation = useMutation({
    mutationFn: (messageId) => api.post(`/admin/messages/${messageId}/flag`),
    onSuccess: invalidate,
  });
  const unflagMutation = useMutation({
    mutationFn: (messageId) => api.post(`/admin/messages/${messageId}/unflag`),
    onSuccess: invalidate,
  });

  if (isLoading) return <p className="small muted">Chargement…</p>;
  if (!conv) return <p className="small muted">Conversation introuvable.</p>;

  const clientName = conv.client ? `${conv.client.firstname} ${conv.client.lastname}` : 'Client';
  const praticienName = conv.praticien ? `${conv.praticien.firstname} ${conv.praticien.lastname}` : 'Praticien';
  const messages = conv.messages ?? [];
  const flaggedCount = messages.filter((m) => m.flagged).length;

  return (
    <>
      <PageHead
        title={`${clientName} ↔ ${praticienName}`}
        subtitle="Consultation en lecture seule · accès réservé à la modération"
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Messages', href: '/admin/messages' }, { label: `${clientName} ↔ ${praticienName}` }]}
      />

      <div className="grid" style={{ gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* Read-only chat */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div className="between" style={{ padding: '16px 20px', borderBottom: '1px solid var(--line)' }}>
            <div className="row gap-2">
              <Avatar name={clientName} size={36} tone="sky" />
              <Icon name="arrowRight" size={14} color="var(--muted)" />
              <Avatar name={praticienName} size={36} tone="violet" />
            </div>
            <Badge variant="neutral"><Icon name="shield" size={13} /> Lecture seule</Badge>
          </div>

          <div className="stack gap-4" style={{ padding: 20, background: 'var(--pearl, #FBF9F6)' }}>
            {messages.length === 0 ? (
              <p className="small muted">Aucun message échangé pour l'instant.</p>
            ) : messages.map((m) => (
              <div key={m.id} style={{ display: 'flex', justifyContent: m.sender_role === 'praticien' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '76%' }}>
                  <div
                    className="card-pad"
                    style={{
                      borderRadius: 18,
                      padding: '11px 15px',
                      background: m.sender_role === 'praticien' ? 'var(--violet-1, #ECE3FA)' : '#fff',
                      border: m.flagged ? '1px solid var(--danger, #D9534F)' : '1px solid var(--line)',
                    }}
                  >
                    <p className="body" style={{ margin: 0, fontSize: 14 }}>{m.text}</p>
                  </div>
                  <div className="row gap-2" style={{ marginTop: 4, justifyContent: m.sender_role === 'praticien' ? 'flex-end' : 'flex-start' }}>
                    <span className="tiny muted">{dateFr(m.created_at)}</span>
                    {m.flagged ? (
                      <button type="button" className="tiny" style={{ color: 'var(--danger, #D9534F)' }} onClick={() => unflagMutation.mutate(m.id)}>
                        Retirer le signalement
                      </button>
                    ) : (
                      <button type="button" className="tiny more" onClick={() => flagMutation.mutate(m.id)}>
                        Signaler ce message
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="row gap-2" style={{ padding: '14px 20px', borderTop: '1px solid var(--line)', color: 'var(--muted)' }}>
            <Icon name="shield" size={15} color="var(--muted)" />
            <span className="tiny">La modération ne peut pas écrire dans cette conversation.</span>
          </div>
        </div>

        {/* Sidebar — participants + context */}
        <div className="stack gap-5">
          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 14 }}>Participants</h3>
            <div className="stack gap-3">
              <div className="row gap-3">
                <Avatar name={clientName} size={40} tone="sky" />
                <div className="flex-1">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{clientName}</div>
                  <div className="tiny">{conv.client?.city ?? '—'}</div>
                </div>
                <Badge variant="neutral">Client</Badge>
              </div>
              <div className="divider" />
              <div className="row gap-3">
                <Avatar name={praticienName} size={40} tone="violet" />
                <div className="flex-1">
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{praticienName}</div>
                  <div className="tiny">{conv.praticien?.specialite} · {conv.praticien?.ville}</div>
                </div>
                {conv.praticien?.statut_verification === 'valide' && <Badge variant="verified" dot>Vérifié</Badge>}
              </div>
            </div>
          </div>

          <div className="card card-pad">
            <h3 className="h-4" style={{ marginBottom: 6 }}>Contexte</h3>
            <dl className="dl">
              <dt>Messages</dt><dd>{messages.length} échangés</dd>
              <dt>Signalés</dt><dd>{flaggedCount > 0 ? <Badge variant="danger" dot>{flaggedCount}</Badge> : <Badge variant="success">0</Badge>}</dd>
              <dt>Démarrée</dt><dd>{dateFr(conv.created_at)}</dd>
              <dt>Dernière activité</dt><dd>{dateFr(conv.updated_at)}</dd>
            </dl>
          </div>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Run the web build**

Run (in `web/`): `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add web/app/admin/messages web/app/admin/message
git commit -m "feat(web): wire admin/messages moderation list and detail with real flag/unflag"
```

---

## Task 11: Web — wire "Contacter" on the praticien profile, delete the dead mock

**Files:**
- Modify: `web/app/(site)/praticien/[id]/page.jsx`
- Delete: `web/lib/data/messages.js`

- [ ] **Step 1: Wire the "Contacter" modal to a real conversation**

In `web/app/(site)/praticien/[id]/page.jsx`, add the router import alongside the existing imports:

```javascript
import { useRouter } from 'next/navigation';
```

Add `const router = useRouter();` inside the component body, near the top (alongside the existing `useQuery` calls).

Replace the "Contacter" `ModalButton` in the booking rail:

```jsx
                <ModalButton
                  modal="contact"
                  payload={{
                    name: p.name,
                    onSubmit: async (values) => {
                      const res = await api.post('/client/conversations', {
                        praticien_id: Number(p.id),
                        text: values.message,
                      });
                      router.push(`/compte/message/${res.data.conversation.id}`);
                    },
                  }}
                  as="button"
                  className="btn btn-soft btn-block"
                >
                  <Icon name="message" size={16} /> Contacter
                </ModalButton>
```

- [ ] **Step 2: Delete the now-unused mock, verifying it has no other importers**

Run (in `web/`): `grep -rl "lib/data/messages" app components lib || echo "no other importers"`
Expected: `no other importers` (Tasks 9 and 10 already repointed the only 4 previous importers away from this file).

```bash
git rm web/lib/data/messages.js
```

- [ ] **Step 3: Run the web build and test suite**

Run (in `web/`): `npm run build` then `npm run test`
Expected: Both PASS.

- [ ] **Step 4: Commit**

```bash
git add web/app/\(site\)/praticien/\[id\]/page.jsx web/lib/data/messages.js
git commit -m "feat(web): wire the praticien profile's Contacter modal to a real conversation"
```

---

## Task 12: Full-stack regression pass

**Files:** none (verification only)

- [ ] **Step 1: Server — full e2e suite**

Run (in `server/`): `npm run test:e2e`
Expected: PASS, all suites including `conversations.e2e-spec.ts`.

- [ ] **Step 2: Server — build**

Run (in `server/`): `npm run build`
Expected: PASS.

- [ ] **Step 3: Mobile — typecheck, tests, lint**

Run (in `mobile/`): `npm run typecheck` then `npm test` then `npm run lint`
Expected: All PASS.

- [ ] **Step 4: Web — build, tests, lint**

Run (in `web/`): `npm run build` then `npm run test` then `npm run lint`
Expected: All PASS.

- [ ] **Step 5: Grep for orphaned references**

Run: `grep -rn "conversationsMock\|sampleChat\|Conversation.*kind\|ChatMessage.*proposal" mobile/src mobile/app web/app web/lib`
Expected: no matches (confirms the mock deletions and type-field removals in Tasks 4, 9, 10, 11 left nothing dangling).

- [ ] **Step 6: Manual smoke checklist (record results, no code changes expected)**

1. As a client (web `/compte/messages` or mobile `(tabs)/messages`): list starts empty.
2. From a praticien's profile page (web `/praticien/:id` or mobile `praticien/:id`), use "Contacter" — lands in a conversation thread.
3. Send a message from the client side; open the same conversation as the praticien (via a praticien JWT — see this plan's "pre-existing gap" note in the Architecture section for how to obtain one on mobile today) and confirm it appears within one poll interval (≤6s) without a manual refresh.
4. Reply as the praticien; confirm the client's conversation list shows an unread dot and the correct preview text, and that opening the thread clears the unread state.
5. As an admin, open `/admin/messages`: the conversation appears with a correct message count and "sain" badge.
6. Flag one message from `/admin/message/:id`; confirm the badge on the list page updates to show the flagged count, and that unflagging reverses it.

---

## Self-review

**1. Spec coverage** — walking the Plan 08 design spec's 08a section line by line:
- Entities `conversations`/`messages` with the exact columns listed (id, client_id, praticien_id, unique pair, timestamps / id, conversation_id, sender_role, text, read_at, flagged, created_at) — Task 1/2. ✓
- Client endpoints `GET/POST /client/conversations`, `GET/POST /client/conversations/:id/messages` — Task 3 (plus a `GET /client/conversations/:id` show endpoint, a reasonable RESTful extension matching the `echanges` module's own `client/echanges/:id` precedent, not a deviation from the spec's intent). ✓
- Praticien endpoints, `PraticienGuard` created — Task 2/3. ✓
- Admin moderation list/detail + flag/unflag on a message — Task 3 (`adminIndex`/`adminShow`/`flagMessage`/`unflagMessage`), Task 10 (UI). ✓
- Mobile client repo repointed — Task 4/6. New praticien-side screens off `dashboard.tsx` — Task 8. ✓
- Web client repointed — Task 9. Web admin repointed with working flag action — Task 10. ✓
- REST + polling, no WebSockets — Task 6/8/9 (`refetchInterval`, justified at 6s). ✓
- `Conversation.kind` decision made and justified (removed) — Task 4's Architecture note, applied in Tasks 4/6/8/9/10. ✓
- `PraticienGuard` built as reusable infra, explicitly flagged for 08e/08f — Architecture section, Task 2. ✓
- Circle/group messaging: not built anywhere in this plan. ✓

**2. Placeholder scan** — searched every task for "TODO", "similar to Task N", "add appropriate error handling", or code blocks that describe rather than show. None found; every step that touches code shows the complete file or complete diff snippet. The one deliberately-scoped-out item (mobile praticien login) is documented as a named, justified gap rather than silently faked or left as a TODO comment in code.

**3. Type/signature consistency across tasks:**
- `messageRepo.send(conversationId: string, text: string): Promise<ChatMessage>` — defined in Task 4, called identically in Task 6 (`messageRepo.send(String(id), value)`) and Task 7 (not called there — Task 7 uses `startConversation`, not `send`). ✓
- `messageRepo.startConversation(praticienId: number): Promise<Conversation>` — defined in Task 4, called in Task 7 as `messageRepo.startConversation(Number(id))`. ✓
- `praticienMessageRepo.{conversations,conversation,messages,send}` — defined in Task 4, called identically in Task 8. ✓
- `ChatMessage` shape (`id, fromMe, text, time, createdAtIso, dayMark?`) — defined in Task 4, produced by `mapMessage` (Task 4) and `appendOptimisticMessage` (Task 4), consumed by `withDayMarks` (Task 4) and `ChatBubble` (Task 5) identically in both chat screens (Tasks 6, 8). ✓
- `Conversation` shape (`id, name, avatar, photo?, preview, when, unread, online`) — defined in Task 4, produced by `mapConversationAsClient`/`mapConversationAsPraticien`, consumed identically by `(tabs)/messages.tsx` and `praticien-messages/index.tsx`. ✓
- Server DTO field names (`praticien_id`, `client_id`, `text`) match exactly what every frontend call site sends: `POST /client/conversations {praticien_id, text?}` (Tasks 4, 7, 11), `POST /praticien/conversations {client_id, text?}` (not called from any frontend in this plan — praticien-initiated conversation start has no UI entry point since praticien-messages/index.tsx only ever shows conversations clients started; the endpoint exists for API symmetry per the spec's "mirrored equivalents" requirement and is exercised by the e2e spec), `POST .../messages {text}` (Tasks 6, 8, 9, 10 for flag/unflag which takes no body). ✓
- `@HttpCode(200)` on both `*Store` routes (Task 3) matches every e2e assertion using `.expect(200)` for those calls (Task 3's own spec) and every frontend call site's expectation of a `data.conversation`/`data.message` shape on success (Tasks 4, 7, 11). Send-message routes stay default 201, matching Task 3's `SendMessageDto` e2e assertions (`.expect(201)`) and the `avis`-module precedent for resource creation. ✓
- `read_at`/`flagged` field names on `Message` (Task 2 entity) match the raw fields consumed by web's admin detail page (Task 10: `m.flagged`) and the client/praticien chat screens, which never read `flagged` (correctly — moderation state isn't shown to end users). ✓

## Exit criteria

Once this plan is fully executed:
- A client can open a praticien's profile on web or mobile, tap "Contacter", write a message, and land in a real conversation thread that persists across sessions.
- That praticien (once authenticated with a praticien JWT) can see the conversation in their own conversation list, read the message, and reply — the reply appears on the client's side within one poll cycle (≤6s) without a manual refresh.
- Both sides see accurate unread indicators that clear when a thread is actually opened.
- An admin can browse every conversation on the platform, open any one of them read-only, and flag or unflag any individual message — the moderation-state badge on the list reflects this immediately.
- No mock messaging data remains anywhere in `mobile/` or `web/` — every messaging screen reads and writes through the real `/client/conversations`, `/praticien/conversations`, and `/admin/conversations` endpoints.
- `PraticienGuard` exists as a clean, tested, reusable piece of auth infrastructure that later Plan 08 sub-plans (08e subscriptions, 08f Stripe Connect) can depend on directly.
