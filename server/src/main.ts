import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });
  applyGlobalConfig(app);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
