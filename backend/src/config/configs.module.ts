import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminConfigService } from '@/config/admin/admin-config.service';
import adminConfigs from '@/config/admin/admin-configs';
import { AppConfigService } from '@/config/app/app-config.service';
import appConfigs from '@/config/app/app-configs';
import { DatabaseConfigService } from '@/config/database/database-config.service';
import databaseConfigs from '@/config/database/database-configs';
import { JwtConfigService } from '@/config/jwt/jwt-config.service';
import jwtConfigs from '@/config/jwt/jwt-configs';
import { SwaggerConfigService } from '@/config/swagger/swagger-config.service';
import swaggerConfigs from '@/config/swagger/swagger-configs';
import { validateEnvironment } from '@/config/validate-environment';

/**
 * The single configuration root. Concerns register namespaces here and nowhere else.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env'],
      load: [...appConfigs, ...adminConfigs, ...databaseConfigs, ...jwtConfigs, ...swaggerConfigs],
      validate: validateEnvironment,
    }),
  ],
  providers: [AdminConfigService, AppConfigService, DatabaseConfigService, JwtConfigService, SwaggerConfigService],
  exports: [AdminConfigService, AppConfigService, DatabaseConfigService, JwtConfigService, SwaggerConfigService],
})
export class ConfigsModule {}
