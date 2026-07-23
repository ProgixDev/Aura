import {
  Body, Controller, Get, HttpCode, Param, Post, Put, Req, UploadedFile, UploadedFiles,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { PraticienAuthService, DOC_TYPES } from './praticien-auth.service';
import { RegisterPraticienDto } from './dto/register-praticien.dto';
import { UpdatePraticienProfileDto } from './dto/update-praticien-profile.dto';
import { LoginDto } from '../admin-auth/dto/login.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { CurrentUser } from '../decorators';
import { User } from '../../database/entities/user.entity';

@Controller('praticien')
export class PraticienAuthController {
  constructor(private readonly service: PraticienAuthService) {}

  @Post('register')
  @UseInterceptors(
    FileFieldsInterceptor(
      DOC_TYPES.map((t) => ({ name: `documents[${t}]`, maxCount: 1 })),
      { limits: { fileSize: 5 * 1024 * 1024 } },
    ),
  )
  register(
    @Body() dto: RegisterPraticienDto,
    @UploadedFiles() files: Record<string, Express.Multer.File[]>,
  ) {
    return this.service.register(dto, files ?? {});
  }

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

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  profile(@CurrentUser() user: User) { return this.service.profile(user); }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Put('profile')
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdatePraticienProfileDto) {
    return this.service.updateProfile(user, dto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('profile/photo')
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 2 * 1024 * 1024 } }))
  uploadPhoto(@CurrentUser() user: User, @UploadedFile() file?: Express.Multer.File) {
    return this.service.uploadPhoto(user, file);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @Post('documents/:type')
  @UseInterceptors(FileInterceptor('document', { limits: { fileSize: 5 * 1024 * 1024 } }))
  resubmitDocument(
    @CurrentUser() user: User,
    @Param('type') type: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.resubmitDocument(user, type, file);
  }

  @UseGuards(JwtAuthGuard)
  @Get('check-token')
  checkToken(@CurrentUser() user: User) { return this.service.checkToken(user); }
}
