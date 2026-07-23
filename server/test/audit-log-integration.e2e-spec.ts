import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AuditLogModule } from '../src/audit-log/audit-log.module';
import { AuditLog } from '../src/database/entities/audit-log.entity';
import { AvisModule } from '../src/avis/avis.module';
import { SignalementsModule } from '../src/signalements/signalements.module';
import { RemboursementsModule } from '../src/remboursements/remboursements.module';
import { PraticienVerificationModule } from '../src/auth/praticien-verification/praticien-verification.module';
import { AdminAuthModule } from '../src/auth/admin-auth/admin-auth.module';
import { Praticien } from '../src/database/entities/praticien.entity';
import { PraticienDocument } from '../src/database/entities/praticien-document.entity';
import { Avis } from '../src/database/entities/avis.entity';
import { Signalement } from '../src/database/entities/signalement.entity';
import { Remboursement } from '../src/database/entities/remboursement.entity';
import { Paiement } from '../src/database/entities/paiement.entity';
import { Client } from '../src/database/entities/client.entity';

describe('audit log integration (real mutation points)', () => {
  let app: INestApplication;
  let ds: DataSource;
  let adminToken: string;

  beforeAll(async () => {
    app = await createTestApp({
      imports: [
        AuditLogModule, AvisModule, SignalementsModule, RemboursementsModule,
        PraticienVerificationModule, AdminAuthModule,
      ],
    });
    ds = app.get(DataSource);
    adminToken = (await seedAdmin(app, 'integ-admin@aura.io')).token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());
  const auth = (r: request.Test) => r.set('Authorization', `Bearer ${adminToken}`);

  const lastLogFor = (action: string) =>
    ds.getRepository(AuditLog).findOne({ where: { action }, order: { id: 'DESC' } });

  it('avis publish/reject each write one row', async () => {
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'ai-prat@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    const a1 = await ds.getRepository(Avis).save({
      full_name_author: 'Ano Nyme', praticien_id: p.id, note: 5, avis: 'x'.repeat(10),
      date_ajout: new Date(), statut: 'en_attente',
    });
    const a2 = await ds.getRepository(Avis).save({
      full_name_author: 'Ano Nyme2', praticien_id: p.id, note: 2, avis: 'y'.repeat(10),
      date_ajout: new Date(), statut: 'en_attente',
    });

    await auth(http().post(`/api/admin/avis/${a1.id}/publish`)).expect(200);
    const publishLog = await lastLogFor('a publié un avis');
    expect(publishLog).toBeTruthy();
    expect(publishLog!.category).toBe('moderation');
    expect((publishLog!.metadata as any).target_label).toContain(`Avis #${a1.id}`);

    await auth(http().post(`/api/admin/avis/${a2.id}/reject`)).expect(200);
    expect(await lastLogFor('a rejeté un avis')).toBeTruthy();
  });

  it('signalement resolve/reject each write one row', async () => {
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'si-prat@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    const { user: reporter } = await seedClientUser(app, 'si-reporter@aura.io');
    const s1 = await ds.getRepository(Signalement).save({
      date_signalement: new Date(), type: 'fake', sujet: 'Sujet',
      motif: 'Motif suffisant', signale_par_id: reporter.id, praticien_id: p.id,
      priorite: 'normale', statut: 'pending',
    });
    const s2 = await ds.getRepository(Signalement).save({
      date_signalement: new Date(), type: 'fake', sujet: 'Sujet2',
      motif: 'Motif suffisant2', signale_par_id: reporter.id, praticien_id: p.id,
      priorite: 'normale', statut: 'pending',
    });

    await auth(http().post(`/api/admin/signalements/${s1.id}/resolve`)).expect(200);
    expect(await lastLogFor('a résolu un signalement')).toBeTruthy();

    await auth(http().post(`/api/admin/signalements/${s2.id}/reject`)).expect(200);
    expect(await lastLogFor('a rejeté un signalement')).toBeTruthy();
  });

  it('remboursement approve/refuse/complete each write one row', async () => {
    const { client } = await seedClientUser(app, 'rb-client@aura.io');
    const p = await ds.getRepository(Praticien).save({
      firstname: 'P', lastname: 'L', email: 'rb-prat@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60),
    });
    const mkPaiement = (ref: string) => ds.getRepository(Paiement).save({
      reference: ref, client_id: client.id, praticien_id: p.id,
      montant_brut: 50, commission: 0, montant_net_praticien: 50,
      moyen_paiement: 'carte', statut: 'paid', date_paiement: new Date(),
    });
    const mkRemb = (ref: string, paiementId: number) => ds.getRepository(Remboursement).save({
      reference: ref, client_id: client.id, paiement_id: paiementId, praticien_id: p.id,
      montant: 50, motif: 'Motif', statut: 'en_attente',
    });

    const pay1 = await mkPaiement('PAY-A1');
    const r1 = await mkRemb('RMB-A1', pay1.id);
    await auth(http().post(`/api/remboursements/admin/${r1.id}/approve`)).expect(200);
    const approveLog = await lastLogFor('a approuvé un remboursement');
    expect(approveLog).toBeTruthy();
    expect((approveLog!.metadata as any).target_label).toBe('RMB-A1');

    const pay2 = await mkPaiement('PAY-A2');
    const r2 = await mkRemb('RMB-A2', pay2.id);
    await auth(http().post(`/api/remboursements/admin/${r2.id}/refuse`))
      .send({ commentaire_admin: 'Justificatif insuffisant' }).expect(200);
    expect(await lastLogFor('a refusé un remboursement')).toBeTruthy();

    await auth(http().post(`/api/remboursements/admin/${r1.id}/complete`)).expect(200);
    expect(await lastLogFor('a marqué un remboursement comme complété')).toBeTruthy();
  });

  it('praticien-verification verify/reject each write one row', async () => {
    const p1 = await ds.getRepository(Praticien).save({
      firstname: 'Vera', lastname: 'Fied', email: 'pv1@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60), statut_verification: 'en_attente',
    });
    const types = ['piece_identite', 'diplome', 'charte', 'justificatif_siret'];
    const docs: PraticienDocument[] = [];
    for (const type of types) {
      docs.push(await ds.getRepository(PraticienDocument).save({
        praticien_id: p1.id, type, nom_fichier: `${type}.pdf`,
        chemin: `x/${type}.pdf`, mime_type: 'application/pdf', taille: 10, statut: 'en_attente',
      }));
    }
    await auth(http().post(`/api/v1/admin/praticiens/verification/${p1.id}/verify`))
      .send({ documents: docs.map((d) => ({ id: d.id, statut: 'valide' })) }).expect(200);
    const verifyLog = await lastLogFor('a vérifié un praticien');
    expect(verifyLog).toBeTruthy();
    expect((verifyLog!.metadata as any).target_label).toBe('Vera Fied');

    const p2 = await ds.getRepository(Praticien).save({
      firstname: 'Rej', lastname: 'Ected', email: 'pv2@x.io', siret: '11111111111111', telephone: '06',
      ville: 'Nice', niveau: 'n', specialite: 's', mode: 'm', status: 'actif',
      tarif: 10, experience: 1, bio: 'b'.repeat(60), statut_verification: 'en_attente',
    });
    await auth(http().post(`/api/v1/admin/praticiens/verification/${p2.id}/reject`))
      .send({ motif_rejet: 'Dossier incomplet et invalide' }).expect(200);
    expect(await lastLogFor('a rejeté un praticien')).toBeTruthy();
  });

  it('admin register/deactivate/activate/destroy each write one row', async () => {
    const reg = await http().post('/api/admin/register').send({
      name: 'New Admin', email: 'newadmin@aura.io',
      password: 'secret123', password_confirmation: 'secret123',
    }).expect(201);
    const registerLog = await lastLogFor('a créé un compte administrateur');
    expect(registerLog).toBeTruthy();
    expect(registerLog!.actor_id).toBe(reg.body.data.user.id);

    const { user: target } = await seedAdmin(app, 'target-admin@aura.io');
    await auth(http().post(`/api/admin/${target.id}/deactivate`)).expect(200);
    expect(await lastLogFor('a désactivé un compte administrateur')).toBeTruthy();

    await auth(http().post(`/api/admin/${target.id}/activate`)).expect(200);
    expect(await lastLogFor('a réactivé un compte administrateur')).toBeTruthy();

    await auth(http().delete(`/api/admin/${target.id}`)).expect(200);
    expect(await lastLogFor('a supprimé un compte administrateur')).toBeTruthy();
  });
});
