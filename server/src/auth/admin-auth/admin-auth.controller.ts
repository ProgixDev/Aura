import {
  Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateAdminRoleDto } from './dto/update-admin-role.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { CapabilityGuard } from '../guards/capability.guard';
import { CurrentUser, RequireCapability } from '../decorators';
import { User } from '../../database/entities/user.entity';

@Controller('admin')
export class AdminAuthController {
  constructor(private readonly service: AdminAuthService) {}

  @Post('register')
  register(@Body() dto: RegisterAdminDto) { return this.service.register(dto); }

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

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('profile')
  profile(@CurrentUser() user: User) { return this.service.profile(user); }

  @UseGuards(JwtAuthGuard)
  @Get('check-token')
  checkToken(@CurrentUser() user: User) { return this.service.checkToken(user); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post('change-password')
  changePassword(@CurrentUser() user: User, @Body() dto: ChangePasswordDto) {
    return this.service.changePassword(user, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('list')
  list(@Query() query: Record<string, any>) { return this.service.list(query); }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/deactivate')
  deactivate(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.deactivate(user, id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @HttpCode(200)
  @Post(':id/activate')
  activate(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.activate(user, id);
  }

  // equipe_roles is an admin-only capability in the matrix (server/src/auth/capabilities.ts)
  // — gating on it here is what actually enforces that, closing a privilege-escalation
  // hole where any is_admin=true account (regardless of role) could otherwise call this
  // route to promote itself (or anyone else) to 'admin'.
  @UseGuards(JwtAuthGuard, AdminGuard, CapabilityGuard)
  @RequireCapability('equipe_roles')
  @HttpCode(200)
  @Post(':id/role')
  updateRole(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAdminRoleDto) {
    return this.service.updateRole(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@CurrentUser() user: User, @Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(user, id);
  }
}
