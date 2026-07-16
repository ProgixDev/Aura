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

// 8 real photographed sets uploaded to the public "aura-public" Supabase Storage bucket
// (from mobile/.image-originals) — cycled via pick() across the 36 seeded praticiens, so
// several practitioners share a face. That's a known limit of only having 8 source sets;
// see conversation notes for the images-populate task.
const IMAGE_BASE = 'https://frcxvpwvlruvbncjfish.supabase.co/storage/v1/object/public/aura-public';
const PHOTO_SETS: Array<{ photo: string; hero: string; gallery: string[] }> = [
  { photo: `${IMAGE_BASE}/practitioners/p1-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p1-hero.png`, gallery: [`${IMAGE_BASE}/practitioners/p1-g1.png`, `${IMAGE_BASE}/practitioners/p1-g2.png`, `${IMAGE_BASE}/practitioners/p1-g3.png`] },
  { photo: `${IMAGE_BASE}/practitioners/p2-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p2-hero.png`, gallery: [`${IMAGE_BASE}/practitioners/p2-g1.png`, `${IMAGE_BASE}/practitioners/p2-g2.png`] },
  { photo: `${IMAGE_BASE}/practitioners/p3-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p3-hero.png`, gallery: [] },
  { photo: `${IMAGE_BASE}/practitioners/p4-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p4-hero.png`, gallery: [] },
  { photo: `${IMAGE_BASE}/practitioners/p5-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p5-hero.png`, gallery: [] },
  { photo: `${IMAGE_BASE}/practitioners/p6-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p6-hero.png`, gallery: [] },
  { photo: `${IMAGE_BASE}/practitioners/p7-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p7-hero.png`, gallery: [] },
  { photo: `${IMAGE_BASE}/practitioners/p8-avatar.png`, hero: `${IMAGE_BASE}/practitioners/p8-hero.png`, gallery: [] },
];

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
    { nom: 'Cercle Aura — Paris', animateur: 'Camille Fontaine', color: pick(CERCLE_PALETTE, 0), description: 'Un rendez-vous mensuel pour se recentrer en groupe, au cœur de Paris.', image: `${IMAGE_BASE}/cercles/cercle-01.jpg` },
    { nom: 'Cercle de femmes — Lyon', animateur: 'Nora El Amrani', color: pick(CERCLE_PALETTE, 1), description: 'Un cercle de parole et de partage entre femmes, une fois par mois.', image: `${IMAGE_BASE}/cercles/cercle-02.jpg` },
    { nom: 'Méditation du matin — Bordeaux', animateur: 'Julien Sabatier', color: pick(CERCLE_PALETTE, 2), description: 'Une séance de méditation guidée pour bien démarrer la journée.', image: `${IMAGE_BASE}/cercles/cercle-03.jpg` },
    { nom: 'Cercle de pleine lune — Marseille', animateur: 'Inès Castellano', color: pick(CERCLE_PALETTE, 3), description: 'Rituel collectif à chaque pleine lune, en bord de mer.', image: `${IMAGE_BASE}/cercles/cercle-04.jpg` },
    { nom: 'Cercle Aura — Toulouse', animateur: 'Hugo Delmas', color: pick(CERCLE_PALETTE, 4), description: 'Le rendez-vous Aura toulousain pour échanger et se ressourcer.', image: `${IMAGE_BASE}/cercles/cercle-05.jpg` },
    { nom: 'Sagesse et Partage — Nantes', animateur: 'Léa Guillou', color: pick(CERCLE_PALETTE, 5), description: 'Un cercle de discussion autour du développement personnel.', image: `${IMAGE_BASE}/cercles/cercle-06.jpg` },
    { nom: 'Cercle de respiration — Strasbourg', animateur: 'Antoine Weber', color: pick(CERCLE_PALETTE, 0), description: 'Ateliers de respiration consciente ouverts à tous les niveaux.', image: `${IMAGE_BASE}/cercles/cercle-07.jpg` },
    { nom: 'Rondes du cœur — Nice', animateur: 'Manon Rey', color: pick(CERCLE_PALETTE, 1), description: 'Un espace bienveillant pour cultiver la gratitude ensemble.', image: `${IMAGE_BASE}/cercles/cercle-08.jpg` },
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
      const photoSet = pick(PHOTO_SETS, i);
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
        photo: photoSet.photo,
        hero: photoSet.hero,
        gallery: photoSet.gallery,
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

// ---- pools for the activity/money/content/messaging seed functions ----

const MOYENS_PAIEMENT = ['card', 'Carte', 'PayPal', 'Apple Pay'];
const REVIEW_TEXTS = [
  'Une séance profonde et apaisante, je me suis senti·e écouté·e du début à la fin.',
  'Praticien·ne à l’écoute, bienveillant·e et très professionnel·le. Je recommande vivement.',
  'Un vrai moment de lâcher-prise. J’ai retrouvé un sommeil serein depuis.',
  'Beaucoup de douceur et de justesse dans l’accompagnement. Merci infiniment.',
  'Expérience transformatrice, je ressors plus légère et alignée.',
  'Accueil chaleureux et cadre rassurant. Une belle découverte.',
  'Séance efficace, j’ai senti les tensions se dénouer rapidement.',
  'Un accompagnement sur-mesure, adapté à mes besoins du moment.',
  'Très à l’écoute, explications claires. Je reviendrai avec plaisir.',
  'Moment suspendu, énergie incroyable. Exactement ce dont j’avais besoin.',
];
const REMBOURSEMENT_MOTIFS = ['Annulation client', 'Praticien indisponible', 'Litige résolu', 'Insatisfaction'];
const DISPUTE_MOTIFS = [
  'Séance non conforme à la description',
  'Praticien absent au rendez-vous',
  'Désaccord sur le montant facturé',
  'Comportement inapproprié signalé',
  'Prestation interrompue avant la fin',
];
const ECHANGE_TYPES = ['proposition', 'demande', 'information', 'autre'];
const ECHANGE_SUBJECTS = [
  'Échange de soins énergétiques',
  'Proposition de partenariat',
  'Question sur une pratique',
  'Demande d’information tarifs',
  'Troc massage contre reiki',
  'Recherche praticien à Lyon',
];
const ECHANGE_MESSAGES = [
  'Bonjour, je souhaiterais échanger une séance de reiki contre un soin énergétique. Seriez-vous intéressé·e ?',
  'Je propose un partenariat pour un atelier commun le mois prochain.',
  'Pourriez-vous m’en dire plus sur votre approche du magnétisme ?',
  'Je cherche à comprendre la différence entre vos deux formules.',
  'Disponible en soirée cette semaine pour un échange de pratiques.',
];
const SIGNALEMENT_TYPES = ['overclaim', 'behavior', 'fake', 'pros', 'other'];
const SIGNALEMENT_MOTIFS = [
  'Le profil revendique des certifications non vérifiables.',
  'Propos déplacés rapportés par un client.',
  'Profil possiblement frauduleux.',
  'Non-respect de la charte praticien.',
  'Contenu inapproprié dans la description.',
];
const ARTICLES: Array<{ titre: string; categorie: string; tonalite: string; temps: number }> = [
  { titre: 'Comprendre le magnétisme et ses bienfaits', categorie: 'Discipline', tonalite: 'sky', temps: 6 },
  { titre: '5 rituels de pleine lune pour se recentrer', categorie: 'Conseils', tonalite: 'gold', temps: 5 },
  { titre: 'Débuter la méditation en 7 jours', categorie: 'Guide', tonalite: 'sage', temps: 8 },
  { titre: 'Reiki : origines et principes', categorie: 'Discipline', tonalite: 'violet', temps: 7 },
  { titre: 'Bien choisir son praticien en énergétique', categorie: 'Guide', tonalite: 'sky', temps: 4 },
  { titre: 'Le bain sonore, voyage intérieur', categorie: 'Discipline', tonalite: 'sky', temps: 5 },
  { titre: 'Gérer son stress au quotidien', categorie: 'Bien-être', tonalite: 'sage', temps: 6 },
  { titre: 'La communauté Aura fête ses 1 an', categorie: 'Communauté', tonalite: 'gold', temps: 3 },
  { titre: 'Hypnose : mythes et réalités', categorie: 'Discipline', tonalite: 'violet', temps: 7 },
  { titre: 'Préparer une retraite de ressourcement', categorie: 'Conseils', tonalite: 'gold', temps: 6 },
  { titre: 'Le sommeil réparateur par la sophrologie', categorie: 'Bien-être', tonalite: 'sage', temps: 5 },
  { titre: 'Purifier son intérieur : le guide complet', categorie: 'Guide', tonalite: 'sky', temps: 9 },
  { titre: 'Coaching de vie : par où commencer', categorie: 'Conseils', tonalite: 'violet', temps: 6 },
  { titre: 'Nos praticiens partagent leurs rituels', categorie: 'Communauté', tonalite: 'gold', temps: 4 },
];
const EVENT_TYPES = ['Retraite', 'Formation', 'Atelier', 'Cercle', 'Sortie', 'Événement'];
// Pexels photos (free license), downloaded to mobile/assets/images/events/ and
// re-uploaded to the public "aura-public" Supabase Storage bucket — see
// conversation notes for the images-populate task.
const EVENTS: Array<{ titre: string; type: string; lieu: string; prix: number; places: number; image: string }> = [
  { titre: 'Retraite de ressourcement en Provence', type: 'Retraite', lieu: 'Marseille', prix: 180, places: 20, image: `${IMAGE_BASE}/events/event-01.jpg` },
  { titre: 'Atelier initiation au reiki', type: 'Atelier', lieu: 'Lyon', prix: 45, places: 15, image: `${IMAGE_BASE}/events/event-02.jpg` },
  { titre: 'Cercle de méditation en pleine nature', type: 'Cercle', lieu: 'Annecy', prix: 0, places: 30, image: `${IMAGE_BASE}/events/event-03.jpg` },
  { titre: 'Formation praticien magnétisme niveau 1', type: 'Formation', lieu: 'Paris', prix: 120, places: 12, image: `${IMAGE_BASE}/events/event-04.jpg` },
  { titre: 'Bain sonore collectif', type: 'Atelier', lieu: 'Bordeaux', prix: 25, places: 25, image: `${IMAGE_BASE}/events/event-05.jpg` },
  { titre: 'Sortie forêt & sylvothérapie', type: 'Sortie', lieu: 'Strasbourg', prix: 15, places: 18, image: `${IMAGE_BASE}/events/event-06.jpg` },
  { titre: 'Soirée pleine lune', type: 'Événement', lieu: 'Nice', prix: 0, places: 40, image: `${IMAGE_BASE}/events/event-07.jpg` },
  { titre: 'Atelier respiration consciente', type: 'Atelier', lieu: 'Toulouse', prix: 30, places: 20, image: `${IMAGE_BASE}/events/event-08.jpg` },
  { titre: 'Retraite silence & méditation', type: 'Retraite', lieu: 'Nantes', prix: 160, places: 16, image: `${IMAGE_BASE}/events/event-09.jpg` },
  { titre: 'Cercle de femmes — équinoxe', type: 'Cercle', lieu: 'Lille', prix: 10, places: 22, image: `${IMAGE_BASE}/events/event-10.jpg` },
];
const PROGRAMME_SLOTS = ['09:00', '10:30', '14:00', '16:00'];
const NOTIF_AUDIENCES = ['clients', 'praticiens', 'tous'];
const NOTIF_CANAUX = ['email', 'push', 'sms'];
const NOTIFICATIONS: Array<{ titre: string; message: string }> = [
  { titre: 'Nouvelle fonctionnalité : les cercles', message: 'Découvrez les cercles près de chez vous.' },
  { titre: 'Rappel : complétez votre profil', message: 'Un profil complet inspire confiance.' },
  { titre: 'Offre de bienvenue', message: 'Profitez de -15% sur votre première séance.' },
  { titre: 'Vos praticiens favoris ont des créneaux', message: 'Réservez avant qu’il ne soit trop tard.' },
  { titre: 'Maintenance planifiée', message: 'Le service sera indisponible dimanche de 2h à 4h.' },
  { titre: 'Nouveaux praticiens vérifiés', message: 'De nouveaux talents ont rejoint Aura.' },
  { titre: 'Votre récapitulatif du mois', message: 'Retrouvez votre activité des 30 derniers jours.' },
];
type AuditCat = 'moderation' | 'verification' | 'finance' | 'security' | 'support' | 'system';
const AUDIT_BY_CATEGORY: Array<{ category: AuditCat; action: string; target: string }> = [
  { category: 'verification', action: 'a vérifié un praticien', target: 'praticien' },
  { category: 'verification', action: 'a rejeté un dossier praticien', target: 'praticien' },
  { category: 'finance', action: 'a approuvé un remboursement', target: 'remboursement' },
  { category: 'finance', action: 'a modifié le taux de commission', target: 'platform_setting' },
  { category: 'moderation', action: 'a publié un avis', target: 'avis' },
  { category: 'moderation', action: 'a résolu un signalement', target: 'signalement' },
  { category: 'support', action: 'a répondu à un ticket', target: 'support_ticket' },
  { category: 'security', action: 's’est connecté au back-office', target: 'user' },
  { category: 'system', action: 'a exporté un rapport', target: 'export' },
];
const SUPPORT_SUBJECTS = [
  'Problème de connexion',
  'Question sur un paiement',
  'Modifier ma réservation',
  'Praticien injoignable',
  'Demande de facture',
  'Bug sur l’application',
  'Supprimer mon compte',
];
const MESSAGE_TEXTS_CLIENT = [
  'Bonjour, est-il possible de décaler ma séance à jeudi ?',
  'Merci beaucoup pour la séance d’hier, c’était parfait.',
  'Proposez-vous des séances en visio ?',
  'Quel est le tarif pour un accompagnement sur plusieurs semaines ?',
  'J’aurais une question avant notre rendez-vous.',
];
const MESSAGE_TEXTS_PRAT = [
  'Bonjour, oui bien sûr, jeudi 15h me convient parfaitement.',
  'Avec grand plaisir, à très vite !',
  'Oui, je propose la visio le mardi et le jeudi.',
  'Je vous propose une formule de 4 séances, je vous envoie le détail.',
  'Bien sûr, je vous écoute.',
];

function titleToSlug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[eéèêë]/g, 'e')
    .replace(/[aàâ]/g, 'a')
    .replace(/[iîï]/g, 'i')
    .replace(/[oôö]/g, 'o')
    .replace(/[uùûü]/g, 'u')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function seedFavorites(ctx: SeedContext, clients: Client[], prats: Praticien[]): Promise<void> {
  const repo = ctx.ds.getRepository(Favorite);
  const seen = new Set<string>();
  const rows: Array<{ client_id: number; praticien_id: number }> = [];
  // ~2 favorites per client, spread across practitioners, deduped on the unique pair.
  for (let i = 0; i < clients.length; i++) {
    for (let k = 0; k < 2; k++) {
      const c = clients[i];
      const p = pick(prats, i * 2 + k * 7);
      const key = `${c.id}-${p.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ client_id: c.id, praticien_id: p.id });
    }
  }
  await repo.save(rows);
  console.log(`  favorites: ${rows.length} rows`);
}

async function seedRendezVous(ctx: SeedContext, clients: Client[], prats: Praticien[]): Promise<RendezVous[]> {
  const repo = ctx.ds.getRepository(RendezVous);
  const validePrats = prats.filter((p) => p.statut_verification === 'valide');
  const pratPool = validePrats.length > 0 ? validePrats : prats;

  // 120 termine (past) / 40 confirme / 30 en_attente (future) / 30 annule = 220.
  const statuts: string[] = [
    ...Array(120).fill('termine'),
    ...Array(40).fill('confirme'),
    ...Array(30).fill('en_attente'),
    ...Array(30).fill('annule'),
  ];

  const rows = statuts.map((statut, i) => {
    const client = pick(clients, i);
    // termine/confirme link to verified practitioners (they look like real completed sessions).
    const praticien =
      statut === 'termine' || statut === 'confirme' ? pick(pratPool, i) : pick(prats, i * 3 + 1);
    let date_heure: Date;
    if (statut === 'termine' || statut === 'annule') {
      date_heure = daysFromNow(-between(1, 180, i * 2 + 1));
    } else if (statut === 'confirme') {
      date_heure = daysFromNow(between(1, 20, i));
    } else {
      date_heure = daysFromNow(between(2, 30, i + 3));
    }
    return {
      client_id: client.id,
      praticien_id: praticien.id,
      date_heure,
      duree_minutes: 60,
      mode: i % 3 === 0 ? 'visio' : 'présentiel',
      statut,
      tarif: praticien.tarif,
    };
  });

  const created = await repo.save(rows);
  console.log(`  rendez_vous: ${created.length} rows (120 termine / 40 confirme / 30 en_attente / 30 annule)`);
  return created;
}

async function seedAvis(ctx: SeedContext, clients: Client[], prats: Praticien[], rdv: RendezVous[]): Promise<void> {
  const repo = ctx.ds.getRepository(Avis);
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const termine = rdv.filter((r) => r.statut === 'termine').slice(0, 100);

  const rows = termine.map((r, i) => {
    const client = clientById.get(r.client_id);
    const author = client ? `${client.firstname} ${client.lastname}` : 'Client Aura';
    const m = i % 100;
    const note = m < 70 ? 5 : m < 92 ? 4 : 3;
    const s = i % 20;
    const statut = s < 17 ? 'publié' : s < 19 ? 'en_attente' : 'rejeté';
    const at = new Date(r.date_heure);
    at.setDate(at.getDate() + 1);
    return {
      full_name_author: author,
      praticien_id: r.praticien_id,
      note,
      avis: pick(REVIEW_TEXTS, i),
      date_ajout: at,
      statut,
    };
  });

  await repo.save(rows);
  console.log(`  avis: ${rows.length} rows (~85 publié / ~10 en_attente / ~5 rejeté)`);
}

async function seedPaiements(ctx: SeedContext, rdv: RendezVous[]): Promise<Paiement[]> {
  const repo = ctx.ds.getRepository(Paiement);
  const payable = rdv.filter((r) => r.statut === 'confirme' || r.statut === 'termine');

  const rows = payable.map((r, i) => {
    const brut = Number(r.tarif);
    const commission = round2(brut * 0.15);
    // ~10 of the payments are already refunded to exercise the 'rembourse' badge.
    const statut = i % 16 === 5 ? 'rembourse' : 'paid';
    return {
      reference: `RDV-${r.id}-${NOW.getTime() + i}`,
      client_id: r.client_id,
      praticien_id: r.praticien_id,
      rendez_vous_id: r.id,
      date_paiement: r.date_heure,
      montant_brut: brut,
      commission,
      montant_net_praticien: round2(brut - commission),
      moyen_paiement: pick(MOYENS_PAIEMENT, i),
      statut,
    };
  });

  const created = await repo.save(rows);
  console.log(`  paiements: ${created.length} rows`);
  return created;
}

async function seedRemboursements(ctx: SeedContext, paiements: Paiement[]): Promise<void> {
  const repo = ctx.ds.getRepository(Remboursement);
  const paiementRepo = ctx.ds.getRepository(Paiement);
  const paid = paiements.filter((p) => p.statut === 'paid').slice(0, 25);
  const STATUTS = ['en_attente', 'en_cours', 'approuve', 'refuse', 'completed'];

  const rows = paid.map((p, i) => {
    const statut = pick(STATUTS, i);
    return {
      reference: `RMB-${String(10000 + i).padStart(5, '0')}`,
      client_id: p.client_id,
      paiement_id: p.id,
      praticien_id: p.praticien_id,
      montant: Number(p.montant_brut),
      motif: pick(REMBOURSEMENT_MOTIFS, i),
      description: i % 2 === 0 ? 'Demande traitée par le service client.' : null,
      statut,
      commentaire_admin: statut === 'refuse' ? 'Conditions de remboursement non remplies.' : null,
    };
  });

  await repo.save(rows);

  // Flip the paiement to 'rembourse' for refunds that were approved/completed.
  const refundedPaiementIds = rows
    .filter((r) => r.statut === 'approuve' || r.statut === 'completed')
    .map((r) => r.paiement_id);
  if (refundedPaiementIds.length > 0) {
    await paiementRepo
      .createQueryBuilder()
      .update()
      .set({ statut: 'rembourse' })
      .whereInIds(refundedPaiementIds)
      .execute();
  }
  console.log(`  remboursements: ${rows.length} rows (across all 5 statuts)`);
}

async function seedDisputes(
  ctx: SeedContext,
  clients: Client[],
  prats: Praticien[],
  paiements: Paiement[],
): Promise<void> {
  const repo = ctx.ds.getRepository(Dispute);
  const statuts: string[] = [...Array(5).fill('ouvert'), ...Array(10).fill('resolu')];

  const rows = statuts.map((statut, i) => {
    const client = pick(clients, i * 2);
    const praticien = pick(prats, i);
    const linkPaiement = i % 2 === 0 && paiements.length > 0 ? pick(paiements, i) : null;
    return {
      client_id: client.id,
      praticien_id: praticien.id,
      paiement_id: linkPaiement ? linkPaiement.id : null,
      montant: linkPaiement ? Number(linkPaiement.montant_brut) : null,
      motif: pick(DISPUTE_MOTIFS, i),
      statut,
      priorite: i % 3 === 0 ? 'haute' : 'normale',
      resolution_notes: statut === 'resolu' ? 'Litige résolu à l’amiable, remboursement partiel accordé.' : null,
    };
  });

  await repo.save(rows);
  console.log(`  disputes: ${rows.length} rows (5 ouvert / 10 resolu)`);
}

async function seedEchanges(ctx: SeedContext, clients: Client[]): Promise<void> {
  const repo = ctx.ds.getRepository(Echange);
  const STATUTS = ['en_attente', 'lu', 'en_cours', 'traite', 'archive', 'signale'];
  const PRIORITES = ['basse', 'moyenne', 'haute', 'urgente'];
  const TOTAL = 32;

  const rows = Array.from({ length: TOTAL }, (_, i) => {
    const client = pick(clients, i);
    const statut = pick(STATUTS, i);
    const hasPieces = i % 4 === 0;
    return {
      client_id: client.id,
      sujet: pick(ECHANGE_SUBJECTS, i),
      type: pick(ECHANGE_TYPES, i),
      message: pick(ECHANGE_MESSAGES, i),
      statut,
      priorite: pick(PRIORITES, i),
      pieces_jointes: hasPieces
        ? [{ nom: 'document.pdf', chemin: `echanges/${client.id}/document-${i}.pdf`, taille: 120345, type: 'application/pdf' }]
        : null,
      motif_signalement: statut === 'signale' ? 'Contenu potentiellement inapproprié.' : null,
      signale_a: statut === 'signale' ? daysFromNow(-between(1, 40, i)) : null,
    };
  });

  await repo.save(rows);
  console.log(`  echanges: ${rows.length} rows (across all 6 statuts)`);
}

async function seedSignalements(ctx: SeedContext, prats: Praticien[], clients: Client[]): Promise<void> {
  const repo = ctx.ds.getRepository(Signalement);
  // signale_par_id references users(id) — use the non-admin (client/praticien) user rows.
  const reporters = await ctx.ds.getRepository(User).find({ where: { is_admin: false } });
  const STATUTS = [...Array(10).fill('pending'), ...Array(8).fill('resolved'), ...Array(4).fill('rejected')];
  const PRIORITES = ['basse', 'normale', 'haute', 'urgente'];

  const rows = STATUTS.map((statut, i) => {
    const praticien = pick(prats, i);
    const reporter = reporters.length > 0 ? pick(reporters, i * 2 + 1) : null;
    return {
      date_signalement: daysFromNow(-between(1, 90, i)),
      type: pick(SIGNALEMENT_TYPES, i),
      sujet: `Signalement — ${praticien.firstname} ${praticien.lastname}`,
      motif: pick(SIGNALEMENT_MOTIFS, i),
      signale_par_id: reporter ? reporter.id : praticien.id,
      praticien_id: praticien.id,
      priorite: pick(PRIORITES, i),
      statut,
    };
  });

  await repo.save(rows);
  console.log(`  signalements: ${rows.length} rows (10 pending / 8 resolved / 4 rejected)`);
}

async function seedArticles(ctx: SeedContext): Promise<void> {
  const repo = ctx.ds.getRepository(Article);
  const rows = ARTICLES.map((a, i) => {
    // 12 publié, then 1 brouillon, 1 archivé (the last two).
    const status = i < 12 ? 'publié' : i === 12 ? 'brouillon' : 'archivé';
    return {
      titre: a.titre,
      slug: titleToSlug(a.titre),
      categorie: a.categorie,
      tonalite: a.tonalite,
      extrait: `${a.titre} — un éclairage clair et accessible pour aller plus loin dans votre bien-être.`,
      corps:
        `Dans cet article, nous explorons ${a.titre.toLowerCase()}. ` +
        'Aura réunit des praticiens vérifiés pour vous accompagner en toute confiance. ' +
        'Prenez le temps de découvrir, à votre rythme, ce qui résonne avec vos besoins du moment. ' +
        'Chaque pratique est présentée avec bienveillance, sans dogme, dans le respect de votre cheminement.',
      status,
      auteur: 'L’équipe Aura',
      temps_lecture: a.temps,
      date_publication: status === 'publié' ? daysFromNow(-between(3, 120, i)) : null,
    };
  });
  await repo.save(rows);
  console.log(`  articles: ${rows.length} rows (12 publié / 1 brouillon / 1 archivé)`);
}

async function seedEvents(ctx: SeedContext, prats: Praticien[]): Promise<void> {
  const eventRepo = ctx.ds.getRepository(Event);
  const epRepo = ctx.ds.getRepository(EventPraticien);
  const validePrats = prats.filter((p) => p.statut_verification === 'valide');
  const pratPool = validePrats.length > 0 ? validePrats : prats;

  const eventRows = EVENTS.map((e, i) => {
    const status = i < 8 ? 'publié' : i === 8 ? 'brouillon' : 'archivé';
    // 1–3 future date strings.
    const nbDates = between(1, 3, i);
    const dates = Array.from({ length: nbDates }, (_, k) => toDateStr(daysFromNow(between(10, 120, i + k * 3))));
    return {
      titre: e.titre,
      type: e.type,
      dates,
      lieu: e.lieu,
      prix: e.prix,
      nombre_places: e.places,
      description: `${e.titre} — un moment à vivre ensemble, encadré par des praticiens Aura. Places limitées.`,
      status,
      image: e.image,
    };
  });
  const createdEvents = await eventRepo.save(eventRows);

  // 1–2 animateurs per event (unique event/praticien pairs), from verified practitioners.
  const epRows: Array<{ event_id: number; praticien_id: number; role: string }> = [];
  const seenEp = new Set<string>();
  createdEvents.forEach((ev, i) => {
    const n = between(1, 2, i);
    for (let k = 0; k < n; k++) {
      const p = pick(pratPool, i * 2 + k);
      const key = `${ev.id}-${p.id}`;
      if (seenEp.has(key)) continue;
      seenEp.add(key);
      epRows.push({ event_id: ev.id, praticien_id: p.id, role: 'animateur' });
    }
  });
  await epRepo.save(epRows);

  // programmes has no TypeORM entity (unmanaged table) — raw insert 2–3 slots per event.
  let progCount = 0;
  for (let i = 0; i < createdEvents.length; i++) {
    const ev = createdEvents[i];
    const n = between(2, 3, i);
    for (let k = 0; k < n; k++) {
      await ctx.ds.query('INSERT INTO programmes (event_id, heure, titre) VALUES ($1, $2, $3)', [
        ev.id,
        pick(PROGRAMME_SLOTS, k),
        `${pick(['Accueil', 'Atelier', 'Pause', 'Méditation guidée', 'Clôture'], i + k)}`,
      ]);
      progCount++;
    }
  }
  console.log(`  events: ${createdEvents.length} rows, ${epRows.length} animateurs, ${progCount} programmes`);
}

async function seedConversations(ctx: SeedContext, clients: Client[], prats: Praticien[]): Promise<void> {
  const convRepo = ctx.ds.getRepository(Conversation);
  const msgRepo = ctx.ds.getRepository(Message);
  const TOTAL = 35;

  const seen = new Set<string>();
  const convPlan: Array<{ client_id: number; praticien_id: number }> = [];
  for (let i = 0; convPlan.length < TOTAL && i < TOTAL * 3; i++) {
    const c = pick(clients, i);
    const p = pick(prats, i * 2 + 1);
    const key = `${c.id}-${p.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    convPlan.push({ client_id: c.id, praticien_id: p.id });
  }
  const conversations = await convRepo.save(convPlan);

  let msgCount = 0;
  let flaggedCount = 0;
  const allMsgs: Array<{
    conversation_id: number;
    sender_role: 'client' | 'praticien';
    text: string;
    read_at: Date | null;
    flagged: boolean;
  }> = [];
  conversations.forEach((conv, i) => {
    const n = between(3, 8, i);
    for (let k = 0; k < n; k++) {
      const isClient = k % 2 === 0;
      // last message from the client sometimes stays unread; a few messages flagged.
      const unread = k === n - 1 && isClient && i % 3 === 0;
      const flagged = i % 7 === 0 && k === 1;
      if (flagged) flaggedCount++;
      allMsgs.push({
        conversation_id: conv.id,
        sender_role: isClient ? 'client' : 'praticien',
        text: isClient ? pick(MESSAGE_TEXTS_CLIENT, i + k) : pick(MESSAGE_TEXTS_PRAT, i + k),
        read_at: unread ? null : daysFromNow(-between(1, 30, i + k)),
        flagged,
      });
      msgCount++;
    }
  });
  await msgRepo.save(allMsgs);
  console.log(`  conversations: ${conversations.length} rows, ${msgCount} messages (${flaggedCount} flagged)`);
}

async function seedNotifications(ctx: SeedContext): Promise<void> {
  const repo = ctx.ds.getRepository(Notification);
  const rows = Array.from({ length: 14 }, (_, i) => {
    const n = pick(NOTIFICATIONS, i);
    return {
      audience: pick(NOTIF_AUDIENCES, i),
      canal: pick(NOTIF_CANAUX, i),
      titre: n.titre,
      message: n.message,
      status: i % 3 === 0 ? 'brouillon' : 'envoyé',
    };
  });
  await repo.save(rows);
  console.log(`  notifications: ${rows.length} rows`);
}

async function seedNotificationPrefs(ctx: SeedContext, clients: Client[]): Promise<void> {
  const repo = ctx.ds.getRepository(NotificationPreference);
  const rows = clients.map((c, i) => ({
    client_id: c.id,
    rappels_seance: i % 5 !== 0,
    nouveaux_messages: i % 3 !== 0,
    reponses_avis: i % 2 === 0,
    newsletter: i % 4 !== 0,
  }));
  await repo.save(rows);
  console.log(`  notification_preferences: ${rows.length} rows`);
}

async function seedAuditLogs(ctx: SeedContext, admins: User[]): Promise<void> {
  const repo = ctx.ds.getRepository(AuditLog);
  const TOTAL = 60;
  const rows = Array.from({ length: TOTAL }, (_, i) => {
    const a = pick(AUDIT_BY_CATEGORY, i);
    const actor = admins.length > 0 ? pick(admins, i) : null;
    return {
      actor_id: actor ? actor.id : null,
      action: a.action,
      target_type: a.target,
      target_id: between(1, 50, i),
      category: a.category,
      metadata: {
        target_label: `${a.target} #${between(1, 50, i)}`,
        actor_role: actor ? actor.role : 'admin',
      },
    };
  });
  await repo.save(rows);
  // created_at defaults to now() (TypeORM won't set @CreateDateColumn on insert); spread the
  // audit trail over the last ~60 days so the timeline reads like real ongoing activity.
  await ctx.ds.query("UPDATE audit_logs SET created_at = now() - ((id * 7) % 60) * interval '1 day'");
  console.log(`  audit_logs: ${rows.length} rows (spread over ~60 days, all 6 categories)`);
}

async function seedSupportTickets(ctx: SeedContext, clients: Client[]): Promise<void> {
  const repo = ctx.ds.getRepository(SupportTicket);
  const STATUTS = ['ouvert', 'en_cours', 'resolu', 'ferme'];
  const PRIORITES = ['basse', 'normale', 'haute'];
  const TOTAL = 22;

  const rows = Array.from({ length: TOTAL }, (_, i) => {
    const linked = i % 3 === 0 ? pick(clients, i) : null;
    const name = linked ? `${linked.firstname} ${linked.lastname}` : `${pick(FIRST_NAMES, i)} ${pick(LAST_NAMES, i)}`;
    const email = linked ? linked.email : `${slugifyName(name)}${i}@gmail.com`;
    const statut = pick(STATUTS, i);
    const hasReply = statut === 'en_cours' || statut === 'resolu';
    return {
      requester_name: name,
      requester_email: email,
      client_id: linked ? linked.id : null,
      sujet: pick(SUPPORT_SUBJECTS, i),
      categorie: 'autre',
      priorite: pick(PRIORITES, i),
      statut,
      message: 'Bonjour, j’ai besoin d’aide concernant ma demande. Merci de me recontacter.',
      messages: hasReply
        ? [{ author: 'support' as const, text: 'Bonjour, nous prenons en charge votre demande.', at: daysFromNow(-between(1, 10, i)).toISOString() }]
        : null,
    };
  });

  await repo.save(rows);
  await ctx.ds.query("UPDATE support_tickets SET created_at = now() - ((id * 5) % 45) * interval '1 day'");
  console.log(`  support_tickets: ${rows.length} rows (across all 4 statuts)`);
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
