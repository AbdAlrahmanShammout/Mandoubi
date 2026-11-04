import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { GlobalExceptionFilter } from '@/common/filter/global-exception.filter';
import { ValidationExceptionFilter } from '@/common/filter/validation-exception.filter';
import { ConfigsModule } from '@/config/configs.module';
import { HealthModule } from '@/health/health.module';
import { FeatureBundleModule } from '@/modules/feature-bundle.module';
import { ProviderModule } from '@/providers/provider.module';

/**
 * Composition root. Domain modules enter through the feature bundle.
 */
@Module({
  imports: [ConfigsModule, ProviderModule, HealthModule, FeatureBundleModule],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_FILTER, useClass: ValidationExceptionFilter },
  ],
})
export class AppModule {}
