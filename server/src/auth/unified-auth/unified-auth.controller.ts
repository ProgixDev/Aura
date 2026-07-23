import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { UnifiedAuthService } from './unified-auth.service';
import { LoginDto } from '../admin-auth/dto/login.dto';

@Controller()
export class UnifiedAuthController {
  constructor(private readonly service: UnifiedAuthService) {}

  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.service.login(dto, req);
  }
}
