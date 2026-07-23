import {
  Body, Controller, Delete, Get, HttpCode, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { ClientAuthService } from './client-auth.service';
import { RegisterClientDto } from './dto/register-client.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateClientProfileDto } from './dto/update-client-profile.dto';
import { ChangeClientPasswordDto } from './dto/change-client-password.dto';
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

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Put('profile')
  updateProfile(
    @CurrentUser() user: User,
    @CurrentClient() client: Client,
    @Body() dto: UpdateClientProfileDto,
  ) {
    return this.service.updateProfile(user, client, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadPhoto(
    @CurrentUser() user: User,
    @CurrentClient() client: Client,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.uploadPhoto(user, client, file);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Post('change-password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangeClientPasswordDto) {
    return this.service.changePassword(user, dto);
  }

  @UseGuards(JwtAuthGuard, ClientGuard)
  @HttpCode(200)
  @Delete('account')
  deleteAccount(@CurrentUser() user: User, @CurrentClient() client: Client) {
    return this.service.deleteAccount(user, client);
  }
}
