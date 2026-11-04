import { Module } from '@nestjs/common';
import { ConfigsModule } from '@/config/configs.module';
import { ProviderModule } from '@/providers/provider.module';

/**
 * Composition root. Domain modules enter later through the feature bundle.
 */
@Module({
  imports: [ConfigsModule, ProviderModule],
})
export class AppModule {}
