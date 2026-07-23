import { Module } from '@nestjs/common';
import { AdminContactController } from './admin-contact.controller';
import { AdminContactService } from './admin-contact.service';
import { MailService } from '../common/mail.service';

@Module({
  controllers: [AdminContactController],
  providers: [AdminContactService, MailService],
})
export class AdminContactModule {}
