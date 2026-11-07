import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { NextFunction, Request, Response } from 'express';
import helmet from 'helmet';

import { AppModule } from '@/app.module';
import { AppValidationPipe } from '@/common/pipes/app-validation.pipe';
import { AppConfigService } from '@/config/app/app-config.service';
import { SwaggerConfigService } from '@/config/swagger/swagger-config.service';
import { SwaggerProvider } from '@/providers/swagger/swagger.provider';

const CORS_PREFLIGHT_MAX_AGE_SECONDS = 600;
const DOCUMENTATION_PATH_PREFIX = '/docs';

/**
 * Applies process-wide HTTP settings shared by the server and the end-to-end tests.
 */
export async function configureApp(app: NestExpressApplication): Promise<void> {
  const appConfig = app.get(AppConfigService);
  const swaggerConfig = app.get(SwaggerConfigService);
  applySecurityHeaders(app, swaggerConfig);
  app.enableCors({
    origin: [...appConfig.allowedOrigins],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    maxAge: CORS_PREFLIGHT_MAX_AGE_SECONDS,
  });
  app.useBodyParser('json', { limit: appConfig.bodySizeLimit });
  app.useGlobalPipes(new AppValidationPipe());
  SwaggerProvider.setup(app, swaggerConfig);
}

/**
 * Boots the HTTP process. Business routes stay in audience modules.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  await configureApp(app);
  await app.listen(app.get(AppConfigService).port);
}

function applySecurityHeaders(app: NestExpressApplication, swaggerConfig: SwaggerConfigService): void {
  app.use((request: Request, response: Response, next: NextFunction): void => {
    const isDocumentation = swaggerConfig.isEnabled && request.path.startsWith(DOCUMENTATION_PATH_PREFIX);
    const secureHeaders = isDocumentation ? helmet({ contentSecurityPolicy: false }) : helmet();
    secureHeaders(request, response, next);
  });
}

const isEntryPoint = typeof require !== 'undefined' && require.main === module;
if (isEntryPoint) {
  void bootstrap();
}
