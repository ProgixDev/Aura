import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp, seedAdmin, seedClientUser, seedPraticienUser } from './utils/create-test-app';
import { AdminContactModule } from '../src/admin-contact/admin-contact.module';
import { MailService } from '../src/common/mail.service';

const fakeMail = { send: jest.fn().mockResolvedValue(undefined) };

describe('admin contact (real email)', () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp(
      { imports: [AdminContactModule] },
      [{ provide: MailService, useValue: fakeMail }],
    );
  });
  afterAll(async () => { await app.close(); });
  beforeEach(() => fakeMail.send.mockClear());
  const http = () => request(app.getHttpServer());

  it('requires admin auth (401 anonymous, 403 non-admin)', async () => {
    await http().post('/api/admin/contact')
      .send({ recipient_type: 'praticien', recipient_id: 1, subject: 'Bonjour', message: 'Test' })
      .expect(401);

    const { token } = await seedClientUser(app, 'notadmin@aura.io');
    await http().post('/api/admin/contact')
      .set('Authorization', `Bearer ${token}`)
      .send({ recipient_type: 'praticien', recipient_id: 1, subject: 'Bonjour', message: 'Test' })
      .expect(403);
  });

  it('sends a real email to a praticien, reply-to the admin, signed by the admin', async () => {
    const { praticien } = await seedPraticienUser(app, 'contact-prat@aura.io');
    const { token: adminToken, user: admin } = await seedAdmin(app, 'boss@aura.io');

    const res = await http().post('/api/admin/contact')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient_type: 'praticien', recipient_id: praticien.id, subject: 'À propos de votre dossier', message: 'Merci de préciser X.' })
      .expect(200);
    expect(res.body.message).toBe('Message envoyé');

    expect(fakeMail.send).toHaveBeenCalledWith({
      to: 'contact-prat@aura.io',
      subject: 'À propos de votre dossier',
      text: expect.stringContaining('Merci de préciser X.'),
      replyTo: admin.email,
    });
    expect(fakeMail.send.mock.calls[0][0].text).toContain(admin.name);
  });

  it('sends a real email to a client', async () => {
    const { client } = await seedClientUser(app, 'contact-client@aura.io');
    const { token: adminToken } = await seedAdmin(app, 'boss2@aura.io');

    await http().post('/api/admin/contact')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient_type: 'client', recipient_id: client.id, subject: 'Votre réservation', message: 'Question rapide.' })
      .expect(200);

    expect(fakeMail.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'contact-client@aura.io' }));
  });

  it('404s for an unknown recipient id', async () => {
    const { token: adminToken } = await seedAdmin(app, 'boss3@aura.io');
    await http().post('/api/admin/contact')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient_type: 'praticien', recipient_id: 999999, subject: 'x', message: 'y' })
      .expect(404);
    expect(fakeMail.send).not.toHaveBeenCalled();
  });

  it('422s on an invalid recipient_type or empty fields', async () => {
    const { token: adminToken } = await seedAdmin(app, 'boss4@aura.io');
    const res = await http().post('/api/admin/contact')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ recipient_type: 'admin', recipient_id: 1, subject: '', message: '' })
      .expect(422);
    expect(res.body.errors.recipient_type).toBeDefined();
    expect(res.body.errors.subject).toBeDefined();
    expect(res.body.errors.message).toBeDefined();
  });
});
