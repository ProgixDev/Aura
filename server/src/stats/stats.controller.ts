import { Controller, Get } from '@nestjs/common';
import { StatsService } from './stats.service';

// Public — no guard. Powers the marketing home page's stat tiles.
@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get()
  index() {
    return this.service.publicStats();
  }
}
