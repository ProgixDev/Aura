import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser } from './utils/create-test-app';
import { AuditLogModule } from '../src/audit-log/audit-log.module';
import { AuditLogService } from '../src/audit-log/audit-log.service';

describe('audit log (core module)', () => {
  let app: INestApplication;
  let adminToken: string;
  let adminUser: any;

  beforeAll(async () => {
    app = await createTestApp({ imports: [AuditLogModule] });
    const seeded = await seedAdmin(app, 'audit-admin@aura.io');
    adminUser = seeded.user;
    adminToken = seeded.token;
  });
  afterAll(async () => { await app.close(); });
  const http = () => request(app.getHttpServer());

  it('GET /api/admin/audit-logs requires a JWT (401) and an admin (403)', async () => {
    await http().get('/api/admin/audit-logs').expect(401);
    const { token: clientToken } = await seedClientUser(app, 'audit-client@aura.io');
    await http().get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${clientToken}`).expect(403);
  });

  it('record() persists a row; index returns it with sanitized actor, target_label, pagination, statistiques', async () => {
    const service = app.get(AuditLogService);
    await service.record(
      adminUser,
      'a publié un avis',
      { type: 'avis', id: 7, label: 'Avis #7 — Marie B.' },
      'moderation',
      { note: 5 },
    );
    await service.record(
      adminUser,
      'a émis un remboursement',
      { type: 'remboursement', id: 3, label: 'RMB-48211' },
      'finance',
    );
    await service.record(
      null,
      'a détecté une tentative de paiement hors plateforme',
      { type: 'conversation', id: 4821, label: 'Conversation #4821' },
      'security',
    );

    const res = await http().get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data).toHaveLength(3);
    // ordered DESC by created_at/id — the security row (actor-less) was recorded last
    expect(res.body.data[0].category).toBe('security');
    expect(res.body.data[0].actor).toBeNull();
    expect(res.body.data[0].metadata.target_label).toBe('Conversation #4821');

    const avisRow = res.body.data.find((r: any) => r.action === 'a publié un avis');
    expect(avisRow.actor).toMatchObject({ id: adminUser.id, name: 'Admin Test' });
    expect(avisRow.actor.password).toBeUndefined();
    expect(avisRow.metadata).toHaveProperty('actor_role');
    expect(avisRow.metadata.note).toBe(5);

    expect(res.body.pagination).toMatchObject({ total: 3 });
    expect(res.body.statistiques).toEqual({ total: 3, security: 1, moderation: 1, finance: 1 });
  });

  it('filters by category, actor_id and date range', async () => {
    const byCategory = await http().get('/api/admin/audit-logs?category=finance')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byCategory.body.data.every((r: any) => r.category === 'finance')).toBe(true);
    expect(byCategory.body.data.length).toBeGreaterThanOrEqual(1);

    const byActor = await http().get(`/api/admin/audit-logs?actor_id=${adminUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(byActor.body.data.every((r: any) => r.actor?.id === adminUser.id)).toBe(true);

    const farFuture = '2999-01-01';
    const noneYet = await http().get(`/api/admin/audit-logs?date_debut=${farFuture}`)
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(noneYet.body.data).toEqual([]);
  });

  it('export/csv returns { filename, csv, total } with a matching header row', async () => {
    const res = await http().get('/api/admin/audit-logs/export')
      .set('Authorization', `Bearer ${adminToken}`).expect(200);
    expect(res.body.data.filename).toMatch(/^export_audit_\d{8}_\d{6}\.csv$/);
    const lines: string[] = res.body.data.csv.split('\n');
    expect(lines[0]).toBe('Date;Auteur;Action;Cible;Type');
    expect(lines).toHaveLength(res.body.data.total + 1);
    expect(lines.some((l) => l.includes('a publié un avis') && l.includes('Avis #7 — Marie B.'))).toBe(true);
    expect(lines.some((l) => l.includes('Système;a détecté'))).toBe(true);
  });
});
