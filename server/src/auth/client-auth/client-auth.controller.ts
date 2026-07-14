import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';

@Controller('client')
export class ClientAuthController {
  constructor(private readonly service: ClientAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterClientDto) { return this.service.register(dto); }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) { return this.service.login(dto, req); }
}
