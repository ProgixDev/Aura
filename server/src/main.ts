import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { applyGlobalConfig } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  applyGlobalConfig(app);
  await app.listen(process.env.PORT ?? 8000);
}
bootstrap();
