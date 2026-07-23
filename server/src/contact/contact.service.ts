import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { MailService } from '../common/mail.service';
import { success } from '../common/envelope';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(private readonly mail: MailService) {}

  // Public/anonymous "contact us" forms (about page, disciplines, blog, events…) —
  // no logged-in identity to derive a recipient or a reply-to from, so both come
  // straight from the form itself. Always lands in the platform's own inbox, never
  // a specific user's — for a specific real person (a praticien) the site already
  // has a better channel: real in-app messaging (see praticien/[id]/page.jsx and
  // compte/reservation/[id]/page.jsx's contact buttons, which start a real
  // conversation via /client/conversations instead of email).
  async send(dto: ContactDto) {
    const inbox = process.env.CONTACT_INBOX || process.env.SMTP_FROM || process.env.SMTP_USER;
    if (!inbox) {
      throw new InternalServerErrorException({
        status: 'error', message: "Aucune adresse de destination n'est configurée.",
      });
    }
    await this.mail.send({
      to: inbox,
      subject: dto.subject,
      text: `${dto.message}\n\n—\n${dto.name} (${dto.email})`,
      replyTo: dto.email,
    });
    return success(undefined, 'Message envoyé');
  }
}
