import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { CerclesService } from './cercles.service';
import { CreateCercleDto } from './dto/create-cercle.dto';
import { UpdateCercleDto } from './dto/update-cercle.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';

@Controller('cercles')
export class CerclesController {
  constructor(private readonly service: CerclesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  store(@Body() dto: CreateCercleDto) {
    return this.service.store(dto);
  }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) {
    return this.service.show(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCercleDto) {
    return this.service.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) {
    return this.service.destroy(id);
  }
}
