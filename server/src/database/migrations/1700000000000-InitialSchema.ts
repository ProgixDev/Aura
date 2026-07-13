import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  public async up(q: QueryRunner): Promise<void> {
    await q.query(`CREATE TABLE users (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      remember_token VARCHAR(100) NULL,
      is_admin TINYINT(1) NOT NULL DEFAULT 0,
      last_login_at TIMESTAMP NULL,
      ip_address VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE clients (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      firstname VARCHAR(255) NOT NULL,
      lastname VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      city VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE praticiens (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
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
      verifie_par BIGINT UNSIGNED NULL,
      motif_rejet TEXT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_prat_verifie_par FOREIGN KEY (verifie_par) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE praticien_documents (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      praticien_id BIGINT UNSIGNED NOT NULL,
      type VARCHAR(50) NOT NULL,
      nom_fichier VARCHAR(255) NOT NULL,
      chemin VARCHAR(255) NOT NULL,
      mime_type VARCHAR(255) NULL,
      taille INT NULL,
      statut VARCHAR(20) NOT NULL DEFAULT 'en_attente',
      commentaire_rejet TEXT NULL,
      verifie_a TIMESTAMP NULL,
      verifie_par BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_pdoc_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE,
      CONSTRAINT fk_pdoc_verifie_par FOREIGN KEY (verifie_par) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE cercles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL UNIQUE,
      description TEXT NULL,
      color VARCHAR(50) NULL,
      animateur VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE events (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      type VARCHAR(255) NOT NULL,
      dates JSON NOT NULL,
      lieu VARCHAR(255) NOT NULL,
      prix DECIMAL(10,2) NOT NULL,
      nombre_places INT NOT NULL,
      description TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'brouillon',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE event_praticien (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      event_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      role VARCHAR(255) NOT NULL DEFAULT 'animateur',
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      UNIQUE KEY uq_event_praticien (event_id, praticien_id),
      CONSTRAINT fk_ep_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
      CONSTRAINT fk_ep_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE programmes (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      event_id BIGINT UNSIGNED NOT NULL,
      heure TIME NOT NULL,
      titre VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_prog_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE promotions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      type VARCHAR(20) NOT NULL DEFAULT 'pourcentage',
      valeur DECIMAL(10,2) NOT NULL,
      date_expiration DATE NOT NULL,
      status VARCHAR(255) NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE avis (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      full_name_author VARCHAR(255) NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      note INT UNSIGNED NOT NULL,
      avis TEXT NOT NULL,
      date_ajout TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      statut VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      CONSTRAINT fk_avis_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE signalements (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      date_signalement TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      type VARCHAR(255) NOT NULL,
      sujet VARCHAR(255) NOT NULL,
      motif TEXT NOT NULL,
      signale_par_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NOT NULL,
      priorite VARCHAR(50) NOT NULL,
      statut VARCHAR(50) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      KEY idx_sig_statut_priorite (statut, priorite),
      KEY idx_sig_type (type),
      KEY idx_sig_date (date_signalement),
      CONSTRAINT fk_sig_user FOREIGN KEY (signale_par_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_sig_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE articles (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      titre VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      categorie VARCHAR(255) NOT NULL,
      tonalite VARCHAR(255) NOT NULL,
      extrait TEXT NOT NULL,
      corps LONGTEXT NOT NULL,
      status VARCHAR(255) NOT NULL,
      auteur VARCHAR(255) NOT NULL,
      temps_lecture INT NOT NULL,
      image_couverture VARCHAR(255) NULL,
      meta_description VARCHAR(255) NULL,
      mot_clef VARCHAR(255) NULL,
      date_publication TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE disciplines (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL,
      tonalite VARCHAR(255) NOT NULL,
      glyphe VARCHAR(255) NOT NULL,
      accroche VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE notifications (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      audience VARCHAR(255) NOT NULL,
      canal VARCHAR(255) NOT NULL,
      titre VARCHAR(255) NOT NULL,
      status VARCHAR(255) NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE email_templates (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      nom VARCHAR(255) NOT NULL,
      objet VARCHAR(255) NOT NULL,
      corps TEXT NOT NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'actif',
      variables JSON NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_tpl_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE echanges (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id BIGINT UNSIGNED NOT NULL,
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
      pieces_jointes JSON NULL,
      reponse_admin TEXT NULL,
      traite_par BIGINT UNSIGNED NULL,
      traite_a TIMESTAMP NULL,
      repondu_a TIMESTAMP NULL,
      lu_a TIMESTAMP NULL,
      est_masque TINYINT(1) NOT NULL DEFAULT 0,
      signale_par BIGINT UNSIGNED NULL,
      motif_signalement VARCHAR(500) NULL,
      signale_a TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_ech_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_ech_traite_par FOREIGN KEY (traite_par) REFERENCES users(id) ON DELETE SET NULL,
      CONSTRAINT fk_ech_signale_par FOREIGN KEY (signale_par) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE paiements (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(255) NOT NULL UNIQUE,
      client_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NULL,
      rendez_vous_id BIGINT UNSIGNED NULL,
      date_paiement TIMESTAMP NULL,
      montant_brut DECIMAL(10,2) NOT NULL,
      commission DECIMAL(10,2) NOT NULL DEFAULT 0,
      montant_net_praticien DECIMAL(10,2) NOT NULL DEFAULT 0,
      moyen_paiement VARCHAR(50) NOT NULL,
      statut VARCHAR(50) NULL,
      details_paiement JSON NULL,
      metadata JSON NULL,
      date_remboursement TIMESTAMP NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_pai_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_pai_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);

    await q.query(`CREATE TABLE remboursements (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      reference VARCHAR(255) NOT NULL UNIQUE,
      client_id BIGINT UNSIGNED NOT NULL,
      paiement_id BIGINT UNSIGNED NOT NULL,
      praticien_id BIGINT UNSIGNED NULL,
      montant DECIMAL(10,2) NOT NULL,
      motif VARCHAR(255) NOT NULL,
      description TEXT NULL,
      statut VARCHAR(50) NOT NULL DEFAULT 'en_attente',
      commentaire_admin TEXT NULL,
      date_traitement TIMESTAMP NULL,
      date_remboursement TIMESTAMP NULL,
      documents JSON NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NULL,
      updated_at TIMESTAMP NULL,
      deleted_at TIMESTAMP NULL,
      CONSTRAINT fk_rmb_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE,
      CONSTRAINT fk_rmb_paiement FOREIGN KEY (paiement_id) REFERENCES paiements(id) ON DELETE CASCADE,
      CONSTRAINT fk_rmb_praticien FOREIGN KEY (praticien_id) REFERENCES praticiens(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`);
  }

  public async down(q: QueryRunner): Promise<void> {
    for (const t of [
      'remboursements', 'paiements', 'echanges', 'email_templates', 'notifications',
      'disciplines', 'articles', 'signalements', 'avis', 'promotions', 'programmes',
      'event_praticien', 'events', 'cercles', 'praticien_documents', 'praticiens',
      'clients', 'users',
    ]) {
      await q.query(`DROP TABLE IF EXISTS ${t}`);
    }
  }
}
