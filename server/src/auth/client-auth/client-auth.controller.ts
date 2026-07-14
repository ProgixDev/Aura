import { Body, Controller, Get, HttpCode, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ClientGuard } from '../guards/client.guard';
import { CurrentUser, CurrentClient } from '../decorators';
import { User } from '../../database/entities/user.entity';
import { Client } from '../../database/entities/client.entity';

@Controller('client')
export class ClientAuthController {
  constructor(private readonly service: ClientAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterClientDto) { return this.service.register(dto); }

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) { return this.service.login(dto, req); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('logout')
  logout() { return this.service.logout(); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('refresh')
  refresh(@CurrentUser() user: User) { return this.service.refresh(user); }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('profile')
  profile(@CurrentUser() user: User, @CurrentClient() client: Client) {
    return this.service.profile(user, client);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @Get('check-token')
  checkToken(@CurrentUser() user: User, @CurrentClient() client: Client) {
    return this.service.checkToken(user, client);
  }

  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) { return this.service.forgotPassword(dto); }
}
