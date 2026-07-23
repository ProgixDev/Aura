import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Praticien } from '../database/entities/praticien.entity';
import { Client } from '../database/entities/client.entity';
import { User } from '../database/entities/user.entity';
import { MailService } from '../common/mail.service';
import { success } from '../common/envelope';
import { AdminContactDto } from './dto/admin-contact.dto';

@Injectable()
export class AdminContactService {
  constructor(
    @InjectRepository(Praticien) private readonly praticiens: Repository<Praticien>,
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly mail: MailService,
  ) {}

  async send(admin: User, dto: AdminContactDto) {
    const recipient = dto.recipient_type === 'praticien'
      ? await this.praticiens.findOneBy({ id: dto.recipient_id })
      : await this.clients.findOneBy({ id: dto.recipient_id });
    if (!recipient) {
      throw new NotFoundException({ status: 'error', message: 'Destinataire introuvable' });
    }

    // reply-to is the admin's own address — the recipient's reply lands directly in
    // the admin's real inbox, not a black hole. No conversation/thread is persisted
    // anywhere in-app; this is a one-shot email, not a message the recipient will
    // see again inside GuériEnergies itself.
    await this.mail.send({
      to: recipient.email,
      subject: dto.subject,
      text: `${dto.message}\n\n—\n${admin.name}, équipe GuériEnergies`,
      replyTo: admin.email,
    });
    return success(undefined, 'Message envoyé');
  }
}
