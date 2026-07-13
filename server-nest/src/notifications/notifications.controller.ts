import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  index(@Query() query: Record<string, any>) { return this.service.index(query); }

  @Post()
  store(@Body() dto: CreateNotificationDto) { return this.service.store(dto); }

  @Get(':id')
  show(@Param('id', ParseIntPipe) id: number) { return this.service.show(id); }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateNotificationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  destroy(@Param('id', ParseIntPipe) id: number) { return this.service.destroy(id); }
}
