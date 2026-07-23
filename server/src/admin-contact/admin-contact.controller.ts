import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { AdminContactService } from './admin-contact.service';
import { AdminContactDto } from './dto/admin-contact.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { CurrentUser } from '../auth/decorators';
import { User } from '../database/entities/user.entity';

@Controller('admin/contact')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminContactController {
  constructor(private readonly service: AdminContactService) {}

  @HttpCode(200)
  @Post()
  send(@CurrentUser() user: User, @Body() dto: AdminContactDto) {
    return this.service.send(user, dto);
  }
}
