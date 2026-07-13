import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from '@nestjs/common';
import { EmailTemplatesService } from './email-templates.service';
import { CreateEmailTemplateDto } from './dto/create-email-template.dto';
import { UpdateEmailTemplateDto } from './dto/update-email-template.dto';

@Controller('emails')
export class EmailTemplatesController {
  constructor(private readonly service: EmailTemplatesService) {}

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

  @Post()
  store(@Body() dto: CreateEmailTemplateDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEmailTemplateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
