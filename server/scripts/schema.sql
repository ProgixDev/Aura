-- GuériEnergies — full database schema. Run this in the Supabase SQL Editor.
--
-- Every datetime column is `timestamptz` and created_at/updated_at carry `default now()`
-- (same convention as the NafesAI schema). timestamptz stores an absolute instant, so it
-- reads back as the correct moment from any timezone; `default now()` populates the audit
-- timestamps at the DB level (the app relies on the column default, it does not set them).
--
-- This script DROPS the existing tables first, so it resets the schema — the only account
-- that exists so far is the test admin, recreate it via POST /api/admin/register afterward.

-- ── Drop (reverse dependency order) ──
drop table if exists support_tickets cascade;
drop table if exists platform_settings cascade;
drop table if exists subscriptions cascade;
drop table if exists disputes cascade;
drop table if exists audit_logs cascade;
drop table if exists peer_messages cascade;
drop table if exists peer_conversations cascade;
drop table if exists messages cascade;
drop table if exists conversations cascade;
drop table if exists notification_preferences cascade;
drop table if exists favorites cascade;
drop table if exists remboursements cascade;
drop table if exists paiements cascade;
drop table if exists rendez_vous cascade;
drop table if exists echanges cascade;
drop table if exists email_templates cascade;
drop table if exists notifications cascade;
drop table if exists disciplines cascade;
drop table if exists articles cascade;
drop table if exists signalements cascade;
drop table if exists avis cascade;
drop table if exists promotions cascade;
drop table if exists programmes cascade;
drop table if exists event_inscriptions cascade;
drop table if exists event_praticien cascade;
drop table if exists events cascade;
drop table if exists cercle_inscriptions cascade;
drop table if exists cercles cascade;
drop table if exists praticien_documents cascade;
drop table if exists praticiens cascade;
drop table if exists clients cascade;
drop table if exists users cascade;
-- Leftover from the earlier TypeORM-migration approach; no longer used.
drop table if exists migrations cascade;

-- ── Create (dependency order) ──
create table users (
  id integer generated always as identity primary key,
  name varchar(255) not null,
  email varchar(255) not null unique,
  password varchar(255) not null,
  remember_token varchar(100),
  is_admin boolean not null default false,
  role varchar(20),
  last_login_at timestamptz,
  ip_address varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table clients (
  id integer generated always as identity primary key,
  firstname varchar(255) not null,
  lastname varchar(255) not null,
  email varchar(255) not null,
  city varchar(255) not null,
  phone varchar(255),
  photo varchar(500),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table praticiens (
  id integer generated always as identity primary key,
  firstname varchar(255) not null,
  lastname varchar(255) not null,
  email varchar(255) not null unique,
  siret varchar(14) not null,
  telephone varchar(255) not null,
  ville varchar(255) not null,
  niveau varchar(255) not null,
  specialite varchar(255) not null,
  mode varchar(255) not null,
  status varchar(255) not null,
  tarif decimal(10,2) not null,
  experience int not null,
  bio text not null,
  statut_verification varchar(20) not null default 'en_attente',
  date_inscription timestamptz,
  verifie_a timestamptz,
  verifie_par integer,
  motif_rejet text,
  stripe_account_id varchar(255),
  stripe_payouts_enabled boolean not null default false,
  photo varchar(500),
  hero varchar(500),
  gallery jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_prat_verifie_par foreign key (verifie_par) references users(id) on delete set null
);

create table praticien_documents (
  id integer generated always as identity primary key,
  praticien_id integer not null,
  type varchar(50) not null,
  nom_fichier varchar(255) not null,
  chemin varchar(255) not null,
  mime_type varchar(255),
  taille int,
  statut varchar(20) not null default 'en_attente',
  commentaire_rejet text,
  verifie_a timestamptz,
  verifie_par integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_pdoc_praticien foreign key (praticien_id) references praticiens(id) on delete cascade,
  constraint fk_pdoc_verifie_par foreign key (verifie_par) references users(id) on delete set null
);

create table cercles (
  id integer generated always as identity primary key,
  nom varchar(255) not null unique,
  description text,
  color varchar(50),
  animateur varchar(255),
  praticien_id integer,
  prix decimal(10,2) not null default 0,
  image varchar(500),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_cercle_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);

create table cercle_inscriptions (
  id integer generated always as identity primary key,
  cercle_id integer not null,
  client_id integer not null,
  statut varchar(20) not null default 'inscrit',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_ci_cercle foreign key (cercle_id) references cercles(id) on delete cascade,
  constraint fk_ci_client foreign key (client_id) references clients(id) on delete cascade
);
create unique index uq_cercle_inscriptions_cercle_client on cercle_inscriptions (cercle_id, client_id);

create table events (
  id integer generated always as identity primary key,
  titre varchar(255) not null,
  type varchar(255) not null,
  dates jsonb not null,
  lieu varchar(255) not null,
  prix decimal(10,2) not null,
  nombre_places int not null,
  description text not null,
  status varchar(20) not null default 'brouillon',
  image varchar(500),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table event_praticien (
  id integer generated always as identity primary key,
  event_id integer not null,
  praticien_id integer not null,
  role varchar(255) not null default 'animateur',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_ep_event foreign key (event_id) references events(id) on delete cascade,
  constraint fk_ep_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);
create unique index uq_event_praticien on event_praticien (event_id, praticien_id);

create table event_inscriptions (
  id integer generated always as identity primary key,
  event_id integer not null,
  client_id integer not null,
  nombre_places int not null default 1,
  statut varchar(20) not null default 'inscrit',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_ei_event foreign key (event_id) references events(id) on delete cascade,
  constraint fk_ei_client foreign key (client_id) references clients(id) on delete cascade
);
create unique index uq_event_inscriptions_event_client on event_inscriptions (event_id, client_id);

create table programmes (
  id integer generated always as identity primary key,
  event_id integer not null,
  heure time not null,
  titre varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_prog_event foreign key (event_id) references events(id) on delete cascade
);

create table promotions (
  id integer generated always as identity primary key,
  code varchar(50) not null unique,
  type varchar(20) not null default 'pourcentage',
  valeur decimal(10,2) not null,
  date_expiration date not null,
  status varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table avis (
  id integer generated always as identity primary key,
  full_name_author varchar(255) not null,
  praticien_id integer not null,
  note int not null,
  avis text not null,
  date_ajout timestamptz not null default now(),
  statut varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_avis_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);

create table signalements (
  id integer generated always as identity primary key,
  date_signalement timestamptz not null default now(),
  type varchar(255) not null,
  sujet varchar(255) not null,
  motif text not null,
  signale_par_id integer not null,
  praticien_id integer,
  client_id integer,
  priorite varchar(50) not null,
  statut varchar(50) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_sig_user foreign key (signale_par_id) references users(id) on delete cascade,
  constraint fk_sig_praticien foreign key (praticien_id) references praticiens(id) on delete cascade,
  constraint fk_sig_client foreign key (client_id) references clients(id) on delete cascade,
  constraint chk_sig_target check (praticien_id is not null or client_id is not null)
);
create index idx_sig_statut_priorite on signalements (statut, priorite);
create index idx_sig_type on signalements (type);
create index idx_sig_date on signalements (date_signalement);

create table articles (
  id integer generated always as identity primary key,
  titre varchar(255) not null,
  slug varchar(255) not null unique,
  categorie varchar(255) not null,
  tonalite varchar(255) not null,
  extrait text not null,
  corps text not null,
  status varchar(255) not null,
  auteur varchar(255) not null,
  temps_lecture int not null,
  image_couverture varchar(255),
  meta_description varchar(255),
  mot_clef varchar(255),
  date_publication timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table disciplines (
  id integer generated always as identity primary key,
  nom varchar(255) not null,
  slug varchar(255) not null,
  tonalite varchar(255) not null,
  glyphe varchar(255) not null,
  accroche varchar(255) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table notifications (
  id integer generated always as identity primary key,
  audience varchar(255) not null,
  canal varchar(255) not null,
  titre varchar(255) not null,
  status varchar(255),
  message text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table email_templates (
  id integer generated always as identity primary key,
  nom varchar(255) not null,
  objet varchar(255) not null,
  corps text not null,
  statut varchar(50) not null default 'actif',
  variables jsonb,
  created_by integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint fk_tpl_created_by foreign key (created_by) references users(id) on delete set null
);

create table echanges (
  id integer generated always as identity primary key,
  client_id integer,
  praticien_id integer,
  sujet varchar(255) not null,
  type varchar(255) not null,
  statut varchar(20) not null default 'en_attente',
  priorite varchar(20) not null default 'moyenne',
  message text not null,
  format varchar(255),
  delai varchar(255),
  ce_que_je_propose varchar(500),
  ce_que_je_recherche varchar(500),
  delai_souhaite date,
  pieces_jointes jsonb,
  reponse_admin text,
  traite_par integer,
  traite_a timestamptz,
  repondu_a timestamptz,
  lu_a timestamptz,
  est_masque boolean not null default false,
  signale_par integer,
  motif_signalement varchar(500),
  signale_a timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint fk_ech_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_ech_praticien foreign key (praticien_id) references praticiens(id) on delete cascade,
  constraint fk_ech_traite_par foreign key (traite_par) references users(id) on delete set null,
  constraint fk_ech_signale_par foreign key (signale_par) references users(id) on delete set null,
  constraint chk_ech_author check (client_id is not null or praticien_id is not null)
);

-- rendez_vous before paiements so paiements.rendez_vous_id can carry its FK + UNIQUE inline.
create table rendez_vous (
  id integer generated always as identity primary key,
  client_id integer not null,
  praticien_id integer not null,
  date_heure timestamptz not null,
  duree_minutes int not null,
  mode varchar(20) not null,
  statut varchar(20) not null default 'en_attente',
  tarif decimal(10,2) not null,
  promotion_id integer,
  stripe_payment_intent_id varchar(255),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_rdv_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_rdv_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);

create table paiements (
  id integer generated always as identity primary key,
  reference varchar(255) not null unique,
  client_id integer not null,
  praticien_id integer,
  rendez_vous_id integer unique,
  date_paiement timestamptz,
  montant_brut decimal(10,2) not null,
  commission decimal(10,2) not null default 0,
  montant_net_praticien decimal(10,2) not null default 0,
  moyen_paiement varchar(50) not null,
  statut varchar(50),
  details_paiement jsonb,
  metadata jsonb,
  date_remboursement timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint fk_pai_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_pai_praticien foreign key (praticien_id) references praticiens(id) on delete set null,
  constraint fk_pai_rendez_vous foreign key (rendez_vous_id) references rendez_vous(id)
);

create table remboursements (
  id integer generated always as identity primary key,
  reference varchar(255) not null unique,
  client_id integer not null,
  paiement_id integer not null,
  praticien_id integer,
  montant decimal(10,2) not null,
  motif varchar(255) not null,
  description text,
  statut varchar(50) not null default 'en_attente',
  commentaire_admin text,
  date_traitement timestamptz,
  date_remboursement timestamptz,
  documents jsonb,
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  deleted_at timestamptz,
  constraint fk_rmb_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_rmb_paiement foreign key (paiement_id) references paiements(id) on delete cascade,
  constraint fk_rmb_praticien foreign key (praticien_id) references praticiens(id) on delete set null
);

create table favorites (
  id integer generated always as identity primary key,
  client_id integer not null,
  praticien_id integer not null,
  created_at timestamptz default now(),
  constraint fk_fav_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_fav_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);
create unique index uq_favorites_client_praticien on favorites (client_id, praticien_id);

-- Polymorphic like `signalements`: exactly one of client_id/praticien_id is set
-- per row (enforced at the app layer). Postgres UNIQUE allows multiple NULLs,
-- so a nullable client_id/praticien_id can each still stay unique per non-null value.
create table notification_preferences (
  id integer generated always as identity primary key,
  client_id integer unique,
  praticien_id integer unique,
  rappels_seance boolean not null default true,
  nouveaux_messages boolean not null default true,
  reponses_avis boolean not null default false,
  newsletter boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_np_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_np_praticien foreign key (praticien_id) references praticiens(id) on delete cascade,
  constraint chk_np_target check (praticien_id is not null or client_id is not null)
);

create table conversations (
  id integer generated always as identity primary key,
  client_id integer not null,
  praticien_id integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_conv_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_conv_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);
create unique index uq_conversations_client_praticien on conversations (client_id, praticien_id);

create table messages (
  id integer generated always as identity primary key,
  conversation_id integer not null,
  sender_role varchar(20) not null,
  text text not null,
  read_at timestamptz,
  flagged boolean not null default false,
  created_at timestamptz default now(),
  constraint fk_msg_conversation foreign key (conversation_id) references conversations(id) on delete cascade
);

create table peer_conversations (
  id integer generated always as identity primary key,
  praticien_a_id integer not null,
  praticien_b_id integer not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_peerconv_praticien_a foreign key (praticien_a_id) references praticiens(id) on delete cascade,
  constraint fk_peerconv_praticien_b foreign key (praticien_b_id) references praticiens(id) on delete cascade
);
create unique index uq_peer_conversations_pair on peer_conversations (praticien_a_id, praticien_b_id);

create table peer_messages (
  id integer generated always as identity primary key,
  conversation_id integer not null,
  sender_praticien_id integer not null,
  text text not null,
  read_at timestamptz,
  flagged boolean not null default false,
  created_at timestamptz default now(),
  constraint fk_peermsg_conversation foreign key (conversation_id) references peer_conversations(id) on delete cascade,
  constraint fk_peermsg_sender foreign key (sender_praticien_id) references praticiens(id) on delete cascade
);

create table audit_logs (
  id integer generated always as identity primary key,
  actor_id integer,
  action varchar(255) not null,
  target_type varchar(100) not null,
  target_id integer,
  category varchar(20) not null,
  metadata jsonb,
  created_at timestamptz default now(),
  constraint fk_audit_logs_actor foreign key (actor_id) references users(id) on delete set null
);
create index idx_audit_logs_category on audit_logs (category);
create index idx_audit_logs_created_at on audit_logs (created_at);

create table disputes (
  id integer generated always as identity primary key,
  client_id integer not null,
  praticien_id integer not null,
  paiement_id integer,
  montant decimal(10,2),
  motif text not null,
  statut varchar(20) not null default 'ouvert',
  priorite varchar(20) not null default 'normale',
  resolution_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_disp_client foreign key (client_id) references clients(id) on delete cascade,
  constraint fk_disp_praticien foreign key (praticien_id) references praticiens(id) on delete cascade,
  constraint fk_disp_paiement foreign key (paiement_id) references paiements(id) on delete set null
);
create index idx_disputes_statut_priorite on disputes (statut, priorite);

create table subscriptions (
  id integer generated always as identity primary key,
  praticien_id integer not null unique,
  plan varchar(20) not null default 'essentiel',
  statut varchar(20) not null default 'active',
  stripe_subscription_id varchar(255),
  stripe_customer_id varchar(255),
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_sub_praticien foreign key (praticien_id) references praticiens(id) on delete cascade
);

create table platform_settings (
  id integer primary key,
  commission_rate decimal(5,4) not null default 0.1500,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table support_tickets (
  id integer generated always as identity primary key,
  requester_name varchar(255) not null,
  requester_email varchar(255) not null,
  client_id integer,
  sujet varchar(255) not null,
  categorie varchar(50) not null default 'autre',
  priorite varchar(20) not null default 'normale',
  statut varchar(20) not null default 'ouvert',
  message text not null,
  messages jsonb,
  assigned_to integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint fk_ticket_client foreign key (client_id) references clients(id) on delete set null,
  constraint fk_ticket_assigned foreign key (assigned_to) references users(id) on delete set null
);
create index idx_support_tickets_statut on support_tickets (statut);
