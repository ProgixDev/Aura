import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactDto } from './dto/contact.dto';

@Controller('contact')
export class ContactController {
  constructor(private readonly service: ContactService) {}

  @HttpCode(200)
  @Post()
  send(@Body() dto: ContactDto) {
    return this.service.send(dto);
  }
}
