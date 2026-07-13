import { INestApplication } from '@nestjs/common';
import { buildValidationPipe } from './common/validation';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

export function applyGlobalConfig(app: INestApplication) {
  app.setGlobalPrefix('api');
  app.enableCors();
  app.useGlobalPipes(buildValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  return app;
}
