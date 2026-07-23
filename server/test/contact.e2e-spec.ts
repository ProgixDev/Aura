import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './utils/create-test-app';
import { ContactModule } from '../src/contact/contact.module';
import { MailService } from '../src/common/mail.service';

const fakeMail = { send: jest.fn().mockResolvedValue(undefined) };

describe('public contact form', () => {
  let app: INestApplication;
  const originalEnv = { ...process.env };

  beforeAll(async () => {
    process.env.CONTACT_INBOX = 'support@aura.io';
    app = await createTestApp(
      { imports: [ContactModule] },
      [{ provide: MailService, useValue: fakeMail }],
    );
  });
  afterAll(async () => {
    await app.close();
    process.env = originalEnv;
  });
  beforeEach(() => fakeMail.send.mockClear());
  const http = () => request(app.getHttpServer());

  it('sends an anonymous message to the configured inbox, reply-to the visitor', async () => {
    const res = await http().post('/api/contact').send({
      name: 'Sarah Lemoine', email: 'sarah@example.com',
      subject: 'Question sur une discipline', message: 'Le magnétisme convient-il pour X ?',
    }).expect(200);
    expect(res.body.message).toBe('Message envoyé');

    expect(fakeMail.send).toHaveBeenCalledWith({
      to: 'support@aura.io',
      subject: 'Question sur une discipline',
      text: expect.stringContaining('Le magnétisme convient-il pour X ?'),
      replyTo: 'sarah@example.com',
    });
    expect(fakeMail.send.mock.calls[0][0].text).toContain('Sarah Lemoine');
  });

  it('422s on missing/invalid fields — no email is attempted', async () => {
    const res = await http().post('/api/contact').send({
      name: '', email: 'not-an-email', subject: '', message: '',
    }).expect(422);
    expect(res.body.errors.name).toBeDefined();
    expect(res.body.errors.email).toBeDefined();
    expect(res.body.errors.subject).toBeDefined();
    expect(res.body.errors.message).toBeDefined();
    expect(fakeMail.send).not.toHaveBeenCalled();
  });

  it('requires no authentication at all', async () => {
    await http().post('/api/contact').send({
      name: 'Anon', email: 'anon@example.com', subject: 'Salut', message: 'Bonjour',
    }).expect(200);
  });
});
