import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../src/database/typeorm.config';

// Entity classes used by the seed* functions below (this task leaves most seed* functions as
// stubs — later tasks flesh them out using these imports for typed repository access).
import { Article } from '../src/database/entities/article.entity';
import { AuditLog } from '../src/database/entities/audit-log.entity';
import { Avis } from '../src/database/entities/avis.entity';
import { Cercle } from '../src/database/entities/cercle.entity';
import { Client } from '../src/database/entities/client.entity';
import { Conversation } from '../src/database/entities/conversation.entity';
import { Discipline } from '../src/database/entities/discipline.entity';
import { Dispute } from '../src/database/entities/dispute.entity';
import { Echange } from '../src/database/entities/echange.entity';
import { EmailTemplate } from '../src/database/entities/email-template.entity';
import { Event } from '../src/database/entities/event.entity';
import { EventPraticien } from '../src/database/entities/event-praticien.entity';
import { Favorite } from '../src/database/entities/favorite.entity';
import { Message } from '../src/database/entities/message.entity';
import { Notification } from '../src/database/entities/notification.entity';
import { NotificationPreference } from '../src/database/entities/notification-preference.entity';
import { Paiement } from '../src/database/entities/paiement.entity';
import { PlatformSetting } from '../src/database/entities/platform-setting.entity';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';
import { Promotion } from '../src/database/entities/promotion.entity';
import { Remboursement } from '../src/database/entities/remboursement.entity';
import { RendezVous } from '../src/database/entities/rendez-vous.entity';
import { Signalement } from '../src/database/entities/signalement.entity';
import { Subscription } from '../src/database/entities/subscription.entity';
import { SupportTicket } from '../src/database/entities/support-ticket.entity';
import { User } from '../src/database/entities/user.entity';

const DEMO_PASSWORD = 'aura1234';

// One fixed "now" for the whole run — every relative-date helper below computes off this
// single snapshot instead of re-reading the clock, so all seeded rows stay consistent
// relative to one another even if the script takes a while to finish.
const NOW = new Date();

export interface SeedContext {
  ds: DataSource;
  demoHash: string;
}

// ---- deterministic helpers (index-based, not random — reseeds stay stable) ----

/** Deterministic index-based pick from an array. */
function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

/** Deterministic n-item selection spread across the array via a stride (not just arr[0..n]). */
function sample<T>(arr: T[], n: number): T[] {
  if (arr.length === 0 || n <= 0) return [];
  if (n >= arr.length) return [...arr];
  const stride = arr.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) {
    out.push(arr[Math.floor(i * stride) % arr.length]);
  }
  return out;
}

/** Deterministic integer in [min, max] derived from an index (no RNG). */
function between(min: number, max: number, i: number): number {
  if (max <= min) return min;
  const span = max - min + 1;
  return min + (((i % span) + span) % span);
}

/** n days offset from the fixed run-start instant (negative n = past dates). */
function daysFromNow(n: number): Date {
  const d = new Date(NOW);
  d.setDate(d.getDate() + n);
  return d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// ---- reference-data pools (shared by the Task 2.3 / 2.4 seed functions below) ----

const CITIES = [
  'Annecy', 'Lyon', 'Paris', 'Bordeaux', 'Marseille', 'Toulouse',
  'Strasbourg', 'Lille', 'Nantes', 'Nice', 'Montpellier', 'Rennes',
];

// Sized 17 / 19 (coprime) so (firstname, lastname) pairs don't repeat across the
// combined 84 praticiens+clients we seed (indices 0..83 < 17*19=323 before wrapping).
// Not that it matters for DB uniqueness — emailLocal() below folds the index into
// every address regardless — but it keeps the generated full names varied.
const FIRST_NAMES = [
  'Camille', 'Julien', 'Sophie', 'Nicolas', 'Emma', 'Lucas', 'Chloé', 'Antoine',
  'Manon', 'Thomas', 'Léa', 'Maxime', 'Sarah', 'Hugo', 'Inès', 'Nathan', 'Julie',
];
const LAST_NAMES = [
  'Martin', 'Bernard', 'Dubois', 'Girard', 'Robert', 'Petit', 'Durand', 'Leroy',
  'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand',
  'Roux', 'Vincent', 'Fournier',
];

// The 12 canonical disciplines — exact nom/slug/tonalite/glyphe per the plan's Conventions
// table (must match web/lib/data/disciplines.js); `accroche` is new one-liner copy.
const DISCIPLINES: Array<{ nom: string; slug: string; tonalite: string; glyphe: string; accroche: string }> = [
  { nom: 'Magnétisme', slug: 'magnetisme', tonalite: 'sky', glyphe: '✦', accroche: "Rééquilibrer les flux d'énergie du corps" },
  { nom: 'Reiki', slug: 'reiki', tonalite: 'violet', glyphe: '❍', accroche: "Transmettre l'énergie de vie universelle" },
  { nom: 'Chamanisme', slug: 'chamanisme', tonalite: 'sage', glyphe: '◊', accroche: 'Voyager pour se relier au vivant' },
  { nom: 'Soin énergétique', slug: 'soin-energetique', tonalite: 'sky', glyphe: '❀', accroche: "Harmoniser les champs d'énergie subtils" },
  { nom: 'Hypnose', slug: 'hypnose', tonalite: 'violet', glyphe: '◐', accroche: "Explorer l'esprit pour transformer en douceur" },
  { nom: 'Méditation', slug: 'meditation', tonalite: 'sage', glyphe: '☉', accroche: "Revenir à l'instant présent" },
  { nom: 'Clairvoyance', slug: 'clairvoyance', tonalite: 'gold', glyphe: '✺', accroche: 'Éclairer un chemin en toute clarté' },
  { nom: 'Bain sonore', slug: 'bain-sonore', tonalite: 'sky', glyphe: '◯', accroche: 'Se laisser traverser par le son' },
  { nom: 'Massage thérapeutique', slug: 'massage', tonalite: 'sage', glyphe: '⌇', accroche: 'Le toucher qui dénoue les tensions' },
  { nom: 'Coaching de vie', slug: 'coaching', tonalite: 'violet', glyphe: '✧', accroche: "Passer à l'action et se transformer" },
  { nom: 'Retraites', slug: 'retraites', tonalite: 'gold', glyphe: '▲', accroche: 'Sortir du quotidien pour se retrouver' },
  { nom: 'Purification', slug: 'purification', tonalite: 'sky', glyphe: '❖', accroche: 'Nettoyer les lieux et les charges' },
];
const DISCIPLINE_NOMS = DISCIPLINES.map((d) => d.nom);

const NIVEAUX = ['Expert', 'Praticien confirmé', 'Novice'];
const MODES = ['présentiel & visio', 'présentiel', 'visio uniquement'];
const DOC_TYPES = ['piece_identite', 'certification', 'assurance', 'domicile', 'charte'];
const CERCLE_PALETTE = ['#8B5CF6', '#38BDF8', '#84A98C', '#D4AF37', '#F472B6', '#F59E0B'];

/** 'YYYY-MM-DD' for `date`-typed columns (e.g. promotions.date_expiration) — that column
 *  takes a plain string per the entity's `date_expiration: string` typing, not a Date. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Strips accents/punctuation down to a clean ASCII fragment for email local-parts.
 *  Explicit map (not a Unicode combining-range regex) — the handful of accented
 *  letters that actually occur in FIRST_NAMES/LAST_NAMES/CITIES below. */
function slugifyName(s: string): string {
  return s
    .toLowerCase()
    .replace(/[eéèêë]/g, 'e')
    .replace(/[aàâ]/g, 'a')
    .replace(/[iîï]/g, 'i')
    .replace(/[oôö]/g, 'o')
    .replace(/[uùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '');
}

/** Deterministic unique email local-part "prenom.nom<index>" — the numeric suffix
 *  guarantees no collisions even though FIRST_NAMES/LAST_NAMES repeat across 36+48 rows. */
function emailLocal(firstname: string, lastname: string, i: number): string {
  return `${slugifyName(firstname)}.${slugifyName(lastname)}${i + 1}`;
}

/** Deterministic French mobile number '06xxxxxxxx'. */
function phoneFor(i: number): string {
  const n = (12345678 + i * 9137) % 100000000;
  return `06${String(n).padStart(8, '0')}`;
}

/** French bio sentence, guaranteed well over the 60-char minimum regardless of inputs. */
function bioFor(firstname: string, specialite: string, ville: string, experience: number): string {
  return `${firstname} accompagne ses client·e·s en ${specialite.toLowerCase()} depuis ${experience} ans à ${ville}, avec une approche douce, à l'écoute et résolument bienveillante pour un mieux-être durable.`;
}

// ---- idempotent reset ----
// TRUNCATE ... CASCADE resolves FK dependency order itself, so listed order doesn't matter;
// RESTART IDENTITY resets every serial/identity sequence so reseeded rows start back at id=1.
// `programmes` has no TypeORM entity (unmanaged legacy table per schema.sql) but is still
// truncated here for a fully clean reset.
async function clearAll(ds: DataSource): Promise<void> {
  await ds.query(`TRUNCATE
    support_tickets, audit_logs, notifications, notification_preferences,
    messages, conversations, favorites, remboursements, paiements, rendez_vous,
    signalements, disputes, echanges, avis, event_praticien, programmes, events,
    articles, promotions, cercles, email_templates, subscriptions,
    praticien_documents, praticiens, clients, disciplines, platform_settings, users
    RESTART IDENTITY CASCADE`);
}

// ---- per-entity seed stubs (later tasks implement; for now each logs and returns [] / void) ----

async function seedPlatformSettings(ctx: SeedContext): Promise<void> {
  // platform_settings.id is a plain (non-generated) PK — set id=1 explicitly so the
  // singleton row PlatformSettingsService.getOrCreate() expects actually lands on id=1.
  await ctx.ds.getRepository(PlatformSetting).save({ id: 1, commission_rate: 0.15 });
  console.log('  platform_settings: 1 row (commission_rate=0.15)');
}

async function seedDisciplines(ctx: SeedContext): Promise<void> {
  const rows = await ctx.ds.getRepository(Discipline).save(DISCIPLINES);
  console.log(`  disciplines: ${rows.length} rows`);
}

async function seedEmailTemplates(ctx: SeedContext): Promise<void> {
  const rows = await ctx.ds.getRepository(EmailTemplate).save([
    {
      nom: 'Confirmation de réservation',
      objet: 'Votre réservation est confirmée',
      corps:
        "Bonjour {{client_name}}, votre séance avec {{praticien_name}} est confirmée pour le {{date}}. À très vite sur Aura !",
      statut: 'actif',
      variables: ['client_name', 'date', 'praticien_name'],
    },
    {
      nom: 'Rappel 24h avant',
      objet: 'Rappel : votre séance a lieu demain',
      corps:
        "Bonjour {{client_name}}, un petit rappel : votre séance avec {{praticien_name}} a lieu demain, le {{date}}. Préparez-vous à prendre soin de vous.",
      statut: 'actif',
      variables: ['client_name', 'date', 'praticien_name'],
    },
    {
      nom: 'Bienvenue',
      objet: 'Bienvenue sur Aura',
      corps:
        "Bonjour {{client_name}}, bienvenue sur Aura ! Découvrez nos praticiens vérifiés et réservez votre première séance en toute confiance.",
      statut: 'actif',
      variables: ['client_name'],
    },
    {
      nom: 'Praticien vérifié',
      objet: 'Votre profil praticien est vérifié',
      corps:
        "Bonjour {{praticien_name}}, félicitations : votre profil est désormais vérifié et visible par tous les clients Aura.",
      statut: 'actif',
      variables: ['praticien_name'],
    },
    {
      nom: "Demande d'avis",
      objet: 'Partagez votre expérience',
      corps:
        "Bonjour {{client_name}}, comment s'est passée votre séance avec {{praticien_name}} ? Laissez un avis pour aider la communauté Aura.",
      statut: 'inactif',
      variables: ['client_name', 'praticien_name'],
    },
  ]);
  console.log(`  email_templates: ${rows.length} rows`);
}

async function seedPromotions(ctx: SeedContext): Promise<void> {
  const rows = await ctx.ds.getRepository(Promotion).save([
    { code: 'BIENVENUE15', type: 'pourcentage', valeur: 15, date_expiration: toDateStr(daysFromNow(120)), status: 'active' },
    { code: 'EQUINOXE25', type: 'pourcentage', valeur: 25, date_expiration: toDateStr(daysFromNow(90)), status: 'active' },
    { code: 'PLEINELUNE', type: 'fixe', valeur: 10, date_expiration: toDateStr(daysFromNow(45)), status: 'archived' },
    { code: 'NOEL2025', type: 'pourcentage', valeur: 20, date_expiration: toDateStr(daysFromNow(160)), status: 'active' },
    { code: 'PRINTEMPS', type: 'fixe', valeur: 15, date_expiration: toDateStr(daysFromNow(200)), status: 'active' },
    { code: 'PARRAINAGE', type: 'pourcentage', valeur: 10, date_expiration: toDateStr(daysFromNow(365)), status: 'archived' },
  ]);
  console.log(`  promotions: ${rows.length} rows`);
}

async function seedCercles(ctx: SeedContext): Promise<void> {
  const rows = await ctx.ds.getRepository(Cercle).save([
    { nom: 'Cercle Aura — Paris', animateur: 'Camille Fontaine', color: pick(CERCLE_PALETTE, 0), description: 'Un rendez-vous mensuel pour se recentrer en groupe, au cœur de Paris.' },
    { nom: 'Cercle de femmes — Lyon', animateur: 'Nora El Amrani', color: pick(CERCLE_PALETTE, 1), description: 'Un cercle de parole et de partage entre femmes, une fois par mois.' },
    { nom: 'Méditation du matin — Bordeaux', animateur: 'Julien Sabatier', color: pick(CERCLE_PALETTE, 2), description: 'Une séance de méditation guidée pour bien démarrer la journée.' },
    { nom: 'Cercle de pleine lune — Marseille', animateur: 'Inès Castellano', color: pick(CERCLE_PALETTE, 3), description: 'Rituel collectif à chaque pleine lune, en bord de mer.' },
    { nom: 'Cercle Aura — Toulouse', animateur: 'Hugo Delmas', color: pick(CERCLE_PALETTE, 4), description: 'Le rendez-vous Aura toulousain pour échanger et se ressourcer.' },
    { nom: 'Sagesse et Partage — Nantes', animateur: 'Léa Guillou', color: pick(CERCLE_PALETTE, 5), description: 'Un cercle de discussion autour du développement personnel.' },
    { nom: 'Cercle de respiration — Strasbourg', animateur: 'Antoine Weber', color: pick(CERCLE_PALETTE, 0), description: 'Ateliers de respiration consciente ouverts à tous les niveaux.' },
    { nom: 'Rondes du cœur — Nice', animateur: 'Manon Rey', color: pick(CERCLE_PALETTE, 1), description: 'Un espace bienveillant pour cultiver la gratitude ensemble.' },
  ]);
  console.log(`  cercles: ${rows.length} rows`);
}

async function seedAdmins(ctx: SeedContext): Promise<User[]> {
  const rows = await ctx.ds.getRepository(User).save([
    {
      name: 'Admin',
      email: 'admin@admin.com',
      // Fixed platform-superadmin password (not ctx.demoHash) per spec — hashed on its own.
      password: await bcrypt.hash('admin123', 12),
      is_admin: true,
      role: 'admin',
    },
    { name: 'Modération Aura', email: 'moderateur@aura.io', password: ctx.demoHash, is_admin: true, role: 'moderateur' },
    { name: 'Support Aura', email: 'support@aura.io', password: ctx.demoHash, is_admin: true, role: 'support' },
    { name: 'Comptabilité Aura', email: 'comptable@aura.io', password: ctx.demoHash, is_admin: true, role: 'comptabilite' },
  ]);
  console.log(`  admins: ${rows.length} rows`);
  return rows;
}

async function seedPraticiens(ctx: SeedContext): Promise<Praticien[]> {
  const userRepo = ctx.ds.getRepository(User);
  const pratRepo = ctx.ds.getRepository(Praticien);

  // verifie_par needs a real admin id. seedAdmins() already ran (and committed) earlier in
  // main()'s pipeline, so re-querying here avoids widening this function's signature just
  // to thread `admins` through from main().
  const admins = await userRepo.find({ where: { is_admin: true } });

  const TOTAL = 36;
  // 30 valide / 2 en_attente / 2 en_cours / 2 rejete, per Task 2.4.
  const VERIF_STATUSES: string[] = [
    ...Array(30).fill('valide'),
    ...Array(2).fill('en_attente'),
    ...Array(2).fill('en_cours'),
    ...Array(2).fill('rejete'),
  ];

  const plan = Array.from({ length: TOTAL }, (_, i) => {
    const firstname = pick(FIRST_NAMES, i);
    const lastname = pick(LAST_NAMES, i);
    return {
      firstname,
      lastname,
      email: `${emailLocal(firstname, lastname, i)}@aura-pro.io`,
      specialite: pick(DISCIPLINE_NOMS, i),
      ville: pick(CITIES, i + 4),
      // + floor(i/12) decorrelates niveau from specialite across the 3 practitioners that
      // otherwise share the same (i % 12) discipline slot, instead of all always matching.
      niveau: pick(NIVEAUX, i + Math.floor(i / 12)),
      mode: pick(MODES, i),
      tarif: between(55, 110, i),
      experience: between(2, 18, i),
      statut_verification: VERIF_STATUSES[i],
    };
  });

  await userRepo.save(
    plan.map((p) => ({
      name: `${p.firstname} ${p.lastname}`,
      email: p.email,
      password: ctx.demoHash,
      is_admin: false,
    })),
  );

  const created = await pratRepo.save(
    plan.map((p, i) => {
      const isValide = p.statut_verification === 'valide';
      const isRejete = p.statut_verification === 'rejete';
      return {
        firstname: p.firstname,
        lastname: p.lastname,
        email: p.email,
        telephone: phoneFor(i),
        ville: p.ville,
        niveau: p.niveau,
        specialite: p.specialite,
        mode: p.mode,
        status: 'actif',
        tarif: p.tarif,
        experience: p.experience,
        bio: bioFor(p.firstname, p.specialite, p.ville, p.experience),
        statut_verification: p.statut_verification,
        date_inscription: daysFromNow(-between(30, 720, i)),
        verifie_a: isValide ? daysFromNow(0) : null,
        verifie_par: isValide && admins.length > 0 ? pick(admins, i).id : null,
        motif_rejet: isRejete ? 'Documents non conformes ou incomplets.' : null,
      };
    }),
  );

  console.log(`  praticiens: ${created.length} rows (30 valide / 2 en_attente / 2 en_cours / 2 rejete)`);
  return created;
}

async function seedClients(ctx: SeedContext): Promise<Client[]> {
  const userRepo = ctx.ds.getRepository(User);
  const clientRepo = ctx.ds.getRepository(Client);
  const TOTAL = 48;

  const plan = Array.from({ length: TOTAL }, (_, i) => {
    const firstname = pick(FIRST_NAMES, i);
    const lastname = pick(LAST_NAMES, i);
    return {
      firstname,
      lastname,
      email: `${emailLocal(firstname, lastname, i)}@gmail.com`,
      city: pick(CITIES, i + 2),
    };
  });

  await userRepo.save(
    plan.map((p) => ({
      name: `${p.firstname} ${p.lastname}`,
      email: p.email,
      password: ctx.demoHash,
      is_admin: false,
    })),
  );

  const created = await clientRepo.save(
    plan.map((p) => ({
      firstname: p.firstname,
      lastname: p.lastname,
      email: p.email,
      city: p.city,
    })),
  );

  console.log(`  clients: ${created.length} rows`);
  return created;
}

async function seedSubscriptions(ctx: SeedContext, prats: Praticien[]): Promise<void> {
  const repo = ctx.ds.getRepository(Subscription);

  // ~20 essentiel / 11 pro / 5 premium (36 total — one row per praticien).
  const PLANS: string[] = [...Array(20).fill('essentiel'), ...Array(11).fill('pro'), ...Array(5).fill('premium')];
  // Mostly active, a handful past_due/trialing/canceled.
  const STATUTS: string[] = [
    ...Array(30).fill('active'),
    ...Array(2).fill('past_due'),
    ...Array(2).fill('trialing'),
    ...Array(2).fill('canceled'),
  ];

  const rows = prats.map((p, i) => {
    const plan = pick(PLANS, i);
    const statut = pick(STATUTS, i);
    const isPaid = plan === 'pro' || plan === 'premium';
    return {
      praticien_id: p.id,
      plan,
      statut,
      stripe_customer_id: isPaid ? `cus_seed${String(p.id).padStart(4, '0')}` : null,
      stripe_subscription_id: isPaid ? `sub_seed${String(p.id).padStart(4, '0')}` : null,
      current_period_end: isPaid ? daysFromNow(between(10, 60, i)) : null,
    };
  });

  await repo.save(rows);
  console.log(`  subscriptions: ${rows.length} rows`);
}

/** Per-document statut for the 5 docs of one praticien, based on their verification state. */
function docStatusesFor(statutVerification: string): string[] {
  switch (statutVerification) {
    case 'valide':
      return DOC_TYPES.map(() => 'valide');
    case 'en_cours':
      return DOC_TYPES.map((_, idx) => (idx % 2 === 0 ? 'valide' : 'en_attente'));
    case 'en_attente':
      return DOC_TYPES.map(() => 'en_attente');
    default: // 'rejete' — at least one rejete, rest valide
      return DOC_TYPES.map((_, idx) => (idx === 0 ? 'rejete' : 'valide'));
  }
}

async function seedPraticienDocuments(ctx: SeedContext, prats: Praticien[]): Promise<void> {
  const repo = ctx.ds.getRepository(PraticienDocument);

  const rows = prats.flatMap((p) => {
    const statuses = docStatusesFor(p.statut_verification);
    return DOC_TYPES.map((type, idx) => ({
      praticien_id: p.id,
      type,
      nom_fichier: `${type}.pdf`,
      chemin: `praticiens/${p.id}/documents/${type}.pdf`,
      mime_type: 'application/pdf',
      taille: between(50_000, 2_000_000, p.id * 5 + idx),
      statut: statuses[idx],
      commentaire_rejet:
        statuses[idx] === 'rejete' ? 'Document illisible ou expiré, merci de le soumettre à nouveau.' : null,
    }));
  });

  await repo.save(rows);
  console.log(`  praticien_documents: ${rows.length} rows (5 per praticien × ${prats.length})`);
}

async function seedFavorites(ctx: SeedContext, clients: Client[], prats: Praticien[]): Promise<void> {
  console.log('  favorites: (stub)');
}

async function seedRendezVous(ctx: SeedContext, clients: Client[], prats: Praticien[]): Promise<RendezVous[]> {
  console.log('  rendez_vous: (stub)');
  return [];
}

async function seedAvis(ctx: SeedContext, clients: Client[], prats: Praticien[], rdv: RendezVous[]): Promise<void> {
  console.log('  avis: (stub)');
}

async function seedPaiements(ctx: SeedContext, rdv: RendezVous[]): Promise<Paiement[]> {
  console.log('  paiements: (stub)');
  return [];
}

async function seedRemboursements(ctx: SeedContext, paiements: Paiement[]): Promise<void> {
  console.log('  remboursements: (stub)');
}

async function seedDisputes(
  ctx: SeedContext,
  clients: Client[],
  prats: Praticien[],
  paiements: Paiement[],
): Promise<void> {
  console.log('  disputes: (stub)');
}

async function seedEchanges(ctx: SeedContext, clients: Client[]): Promise<void> {
  console.log('  echanges: (stub)');
}

async function seedSignalements(ctx: SeedContext, prats: Praticien[], clients: Client[]): Promise<void> {
  console.log('  signalements: (stub)');
}

async function seedArticles(ctx: SeedContext): Promise<void> {
  console.log('  articles: (stub)');
}

async function seedEvents(ctx: SeedContext, prats: Praticien[]): Promise<void> {
  console.log('  events: (stub)');
}

async function seedConversations(ctx: SeedContext, clients: Client[], prats: Praticien[]): Promise<void> {
  console.log('  conversations: (stub)');
}

async function seedNotifications(ctx: SeedContext): Promise<void> {
  console.log('  notifications: (stub)');
}

async function seedNotificationPrefs(ctx: SeedContext, clients: Client[]): Promise<void> {
  console.log('  notification_preferences: (stub)');
}

async function seedAuditLogs(ctx: SeedContext, admins: User[]): Promise<void> {
  console.log('  audit_logs: (stub)');
}

async function seedSupportTickets(ctx: SeedContext, clients: Client[]): Promise<void> {
  console.log('  support_tickets: (stub)');
}

async function main(): Promise<void> {
  const ds = new DataSource({ ...buildDataSourceOptions(), synchronize: false });
  await ds.initialize();
  const demoHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const ctx: SeedContext = { ds, demoHash };

  console.log('Clearing…');
  await clearAll(ds);

  console.log('Seeding…');
  await seedPlatformSettings(ctx);
  await seedDisciplines(ctx);
  await seedEmailTemplates(ctx);
  await seedPromotions(ctx);
  await seedCercles(ctx);
  const admins = await seedAdmins(ctx);
  const prats = await seedPraticiens(ctx);
  const clients = await seedClients(ctx);
  await seedSubscriptions(ctx, prats);
  await seedPraticienDocuments(ctx, prats);
  await seedFavorites(ctx, clients, prats);
  const rdv = await seedRendezVous(ctx, clients, prats);
  await seedAvis(ctx, clients, prats, rdv);
  const paiements = await seedPaiements(ctx, rdv);
  await seedRemboursements(ctx, paiements);
  await seedDisputes(ctx, clients, prats, paiements);
  await seedEchanges(ctx, clients);
  await seedSignalements(ctx, prats, clients);
  await seedArticles(ctx);
  await seedEvents(ctx, prats);
  await seedConversations(ctx, clients, prats);
  await seedNotifications(ctx);
  await seedNotificationPrefs(ctx, clients);
  await seedAuditLogs(ctx, admins);
  await seedSupportTickets(ctx, clients);

  await ds.destroy();
  console.log('Seed complete.');
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
