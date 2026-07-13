import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query, Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Controller('articles')
export class ArticlesController {
  constructor(private readonly service: ArticlesService) {}

  @Get()
  index(@Query() query: Record<string, any>, @Req() req: Request) {
    return this.service.index(query, req);
  }

  @Post('create-article')
  store(@Body() dto: CreateArticleDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) { return this.service.publish(id); }

  @Put(':id/archive')
  archive(@Param('id', ParseIntPipe) id: number) { return this.service.archive(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateArticleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
