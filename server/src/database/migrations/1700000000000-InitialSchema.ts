import { MigrationInterface, QueryRunner } from 'typeorm';

// Postgres/Supabase schema. Collapsed from the original 9 MySQL migrations into one
// fresh migration — no production data ever existed against the old MySQL schema, so
// there is no history worth preserving; a single file is a smaller/safer diff to review
// than translating all 9 in place. Covers everything the 9 files cumulatively produced.
export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE users (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      remember_token VARCHAR(100) NULL,
      is_admin BOOLEAN NOT NULL DEFAULT false,
      role VARCHAR(20) NULL,
      last_login_at TIMESTAMP NULL,
      ip_address VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE clients (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      firstname VARCHAR(255) NOT NULL,
      lastname VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE praticiens (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      firstname VARCHAR(255) NOT NULL,
      lastname VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      telephone VARCHAR(255) NOT NULL,
      ville VARCHAR(255) NOT NULL,
      niveau VARCHAR(255) NOT NULL,
      specialite VARCHAR(255) NOT NULL,
      mode VARCHAR(255) NOT NULL,
      status VARCHAR(255) NOT NULL,
      tarif DECIMAL(10,2) NOT NULL,
      experience INT NOT NULL,
      bio TEXT NOT NULL,
      statut_verification VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      date_inscription TIMESTAMP NULL,
      verifie_a TIMESTAMP NULL,
      verifie_par INTEGER NULL,
      motif_rejet TEXT NULL,
      stripe_account_id VARCHAR(255) NULL,
      stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_prat_verifie_par FOREIGN KEY (verifie_par) REFERENCES users(id) ON DELETE SET NULL
    )`);

    await q.query(`CREATE TABLE praticien_documents (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      praticien_id INTEGER NOT NULL,
      type VARCHAR(50) NOT NULL,
      nom_fichier VARCHAR(255) NOT NULL,
      chemin VARCHAR(255) NOT NULL,
      mime_type VARCHAR(255) NULL,
      taille INT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      commentaire_rejet TEXT NULL,
      verifie_a TIMESTAMP NULL,
      verifie_par INTEGER NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_pdoc_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE,
      CONSTRAINT fk_pdoc_verifie_par FOREIGN KEY (verifie_par) REFERENCES users(id) ON DELETE SET NULL
    )`);

    await q.query(`CREATE TABLE cercles (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      nom VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NULL,
      color VARCHAR(50) NULL,
      animateur VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE events (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      dates JSONB NOT NULL,
      lieu VARCHAR(255) NOT NULL,
      prix DECIMAL(10,2) NOT NULL,
      nombre_places INT NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'brouillon',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE event_praticien (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_id INTEGER NOT NULL,
      praticien_id INTEGER NOT NULL,
      role VARCHAR(255) NOT NULL DEFAULT 'animateur',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_ep_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      CONSTRAINT fk_ep_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_event_praticien ON event_praticien (event_id, praticien_id)`);

    await q.query(`CREATE TABLE programmes (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      event_id INTEGER NOT NULL,
      heure TIME NOT NULL,
      titre VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_prog_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )`);

    await q.query(`CREATE TABLE promotions (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(20) NOT NULL DEFAULT 'pourcentage',
      valeur DECIMAL(10,2) NOT NULL,
      date_expiration DATE NOT NULL,
      status VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE avis (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      full_name_author VARCHAR(255) NOT NULL,
      praticien_id INTEGER NOT NULL,
      note INT NOT NULL,
      avis TEXT NOT NULL,
      date_ajout TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      statut VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_avis_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);

    await q.query(`CREATE TABLE signalements (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      date_signalement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      type VARCHAR(255) NOT NULL,
      sujet VARCHAR(255) NOT NULL,
      motif TEXT NOT NULL,
      signale_par_id INTEGER NOT NULL,
      praticien_id INTEGER NOT NULL,
      priorite VARCHAR(50) NOT NULL,
      statut VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_sig_user FOREIGN KEY (signale_par_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_sig_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);
    await q.query(`CREATE INDEX idx_sig_statut_priorite ON signalements (statut, priorite)`);
    await q.query(`CREATE INDEX idx_sig_type ON signalements (type)`);
    await q.query(`CREATE INDEX idx_sig_date ON signalements (date_signalement)`);

    await q.query(`CREATE TABLE articles (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      categorie VARCHAR(255) NOT NULL,
      tonalite VARCHAR(255) NOT NULL,
      extrait TEXT NOT NULL,
      corps TEXT NOT NULL,
      status VARCHAR(255) NOT NULL,
      auteur VARCHAR(255) NOT NULL,
      temps_lecture INT NOT NULL,
      image_couverture VARCHAR(255) NULL,
      meta_description VARCHAR(255) NULL,
      mot_clef VARCHAR(255) NULL,
      date_publication TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE disciplines (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      tonalite VARCHAR(255) NOT NULL,
      glyphe VARCHAR(255) NOT NULL,
      accroche VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE notifications (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      audience VARCHAR(255) NOT NULL,
      canal VARCHAR(255) NOT NULL,
      titre VARCHAR(255) NOT NULL,
      status VARCHAR(255) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);

    await q.query(`CREATE TABLE email_templates (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      objet VARCHAR(255) NOT NULL,
      corps TEXT NOT NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'actif',
      variables JSONB NULL,
      created_by INTEGER NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_tpl_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )`);

    await q.query(`CREATE TABLE echanges (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      client_id INTEGER NOT NULL,
      sujet VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      priorite VARCHAR(20) NOT NULL DEFAULT 'moyenne',
      message TEXT NOT NULL,
      format VARCHAR(255) NULL,
      delai VARCHAR(255) NULL,
      ce_que_je_propose VARCHAR(500) NULL,
      ce_que_je_recherche VARCHAR(500) NULL,
      delai_souhaite DATE NULL,
      pieces_jointes JSONB NULL,
      reponse_admin TEXT NULL,
      traite_par INTEGER NULL,
      traite_a TIMESTAMP NULL,
      repondu_a TIMESTAMP NULL,
      lu_a TIMESTAMP NULL,
      est_masque BOOLEAN NOT NULL DEFAULT false,
      signale_par INTEGER NULL,
      motif_signalement VARCHAR(500) NULL,
      signale_a TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_ech_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_ech_traite_par FOREIGN KEY (traite_par) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_ech_signale_par FOREIGN KEY (signale_par) REFERENCES users(id) ON DELETE SET NULL
    )`);

    // rendez_vous created ahead of paiements (unlike the old MySQL migration order) so
    // paiements.rendez_vous_id can carry its FK+UNIQUE inline instead of a follow-up ALTER.
    await q.query(`CREATE TABLE rendez_vous (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      client_id INTEGER NOT NULL,
      praticien_id INTEGER NOT NULL,
      date_heure TIMESTAMP NOT NULL,
      duree_minutes INT NOT NULL,
      mode VARCHAR(20) NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      tarif DECIMAL(10,2) NOT NULL,
      promotion_id INTEGER NULL,
      stripe_payment_intent_id VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_rdv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_rdv_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);

    await q.query(`CREATE TABLE paiements (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      reference VARCHAR(255) NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      praticien_id INTEGER NULL,
      rendez_vous_id INTEGER NULL UNIQUE,
      date_paiement TIMESTAMP NULL,
      montant_brut DECIMAL(10,2) NOT NULL,
      commission DECIMAL(10,2) NOT NULL DEFAULT 0,
      montant_net_praticien DECIMAL(10,2) NOT NULL DEFAULT 0,
      moyen_paiement VARCHAR(50) NOT NULL,
      statut VARCHAR(50) NULL,
      details_paiement JSONB NULL,
      metadata JSONB NULL,
      date_remboursement TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_pai_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_pai_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE SET NULL,
      CONSTRAINT fk_pai_rendez_vous FOREIGN KEY (rendez_vous_id) REFERENCES rendez_vous(id)
    )`);

    await q.query(`CREATE TABLE remboursements (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      reference VARCHAR(255) NOT NULL UNIQUE,
      client_id INTEGER NOT NULL,
      paiement_id INTEGER NOT NULL,
      praticien_id INTEGER NULL,
      montant DECIMAL(10,2) NOT NULL,
      motif VARCHAR(255) NOT NULL,
      description TEXT NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'en_attente',
      commentaire_admin TEXT NULL,
      date_traitement TIMESTAMP NULL,
      date_remboursement TIMESTAMP NULL,
      documents JSONB NULL,
      metadata JSONB NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_rmb_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_rmb_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE CASCADE,
      CONSTRAINT fk_rmb_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE SET NULL
    )`);

    await q.query(`CREATE TABLE favorites (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      client_id INTEGER NOT NULL,
      praticien_id INTEGER NOT NULL,
      created_at TIMESTAMP NULL,
      CONSTRAINT fk_fav_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_fav_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_favorites_client_praticien ON favorites (client_id, praticien_id)`);

    await q.query(`CREATE TABLE notification_preferences (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      client_id INTEGER NOT NULL UNIQUE,
      rappels_seance BOOLEAN NOT NULL DEFAULT true,
      nouveaux_messages BOOLEAN NOT NULL DEFAULT true,
      reponses_avis BOOLEAN NOT NULL DEFAULT false,
      newsletter BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_np_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    )`);

    await q.query(`CREATE TABLE conversations (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      client_id INTEGER NOT NULL,
      praticien_id INTEGER NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_conv_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_conv_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);
    await q.query(`CREATE UNIQUE INDEX uq_conversations_client_praticien ON conversations (client_id, praticien_id)`);

    await q.query(`CREATE TABLE messages (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      conversation_id INTEGER NOT NULL,
      sender_role VARCHAR(20) NOT NULL,
      text TEXT NOT NULL,
      read_at TIMESTAMP NULL,
      flagged BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMP NULL,
      CONSTRAINT fk_msg_conversation FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
    )`);

    await q.query(`CREATE TABLE audit_logs (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      actor_id INTEGER NULL,
      action VARCHAR(255) NOT NULL,
      target_type VARCHAR(100) NOT NULL,
      target_id INTEGER NULL,
      category VARCHAR(20) NOT NULL,
      metadata JSONB NULL,
      created_at TIMESTAMP NULL,
      CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL
    )`);
    await q.query(`CREATE INDEX idx_audit_logs_category ON audit_logs (category)`);
    await q.query(`CREATE INDEX idx_audit_logs_created_at ON audit_logs (created_at)`);

    await q.query(`CREATE TABLE disputes (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      client_id INTEGER NOT NULL,
      praticien_id INTEGER NOT NULL,
      paiement_id INTEGER NULL,
      montant DECIMAL(10,2) NULL,
      motif TEXT NOT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'ouvert',
      priorite VARCHAR(20) NOT NULL DEFAULT 'normale',
      resolution_notes TEXT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_disp_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_disp_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE,
      CONSTRAINT fk_disp_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE SET NULL
    )`);
    await q.query(`CREATE INDEX idx_disputes_statut_priorite ON disputes (statut, priorite)`);

    await q.query(`CREATE TABLE subscriptions (
      id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      praticien_id INTEGER NOT NULL UNIQUE,
      plan VARCHAR(20) NOT NULL DEFAULT 'essentiel',
      statut VARCHAR(20) NOT NULL DEFAULT 'active',
      stripe_subscription_id VARCHAR(255) NULL,
      stripe_customer_id VARCHAR(255) NULL,
      current_period_end TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_sub_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    )`);
    // Backfill is a no-op on a fresh install (no praticiens exist yet at migration time) —
    // kept for parity with the original migration in case seed data is inserted before this
    // runs in some environment.
    await q.query(`INSERT INTO subscriptions (praticien_id, plan, statut, created_at, updated_at)
      SELECT id, 'essentiel', 'active', NOW(), NOW() FROM praticiens`);

    await q.query(`CREATE TABLE platform_settings (
      id INTEGER PRIMARY KEY,
      commission_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    )`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'platform_settings', 'subscriptions', 'disputes', 'audit_logs', 'messages',
      'conversations', 'notification_preferences', 'favorites', 'remboursements',
      'paiements', 'rendez_vous', 'echanges', 'email_templates', 'notifications',
      'disciplines', 'articles', 'signalements', 'avis', 'promotions', 'programmes',
      'event_praticien', 'events', 'cercles', 'praticien_documents', 'praticiens',
      'clients', 'users',
    ]) {
      await q.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
    }
  }
}
