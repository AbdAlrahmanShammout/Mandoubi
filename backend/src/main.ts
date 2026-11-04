import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppConfigService } from '@/config/app/app-config.service';
import { AppModule } from '@/app.module';

const CORS_PREFLIGHT_MAX_AGE_SECONDS = 600;

/**
 * Boots the HTTP process. Business routes stay in audience modules.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const appConfig = app.get(AppConfigService);
  app.use(helmet());
  app.enableCors({
    origin: [...appConfig.allowedOrigins],
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: CORS_PREFLIGHT_MAX_AGE_SECONDS,
  });
  app.useBodyParser('json', { limit: appConfig.bodySizeLimit });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  await app.listen(appConfig.port);
}
void bootstrap();
