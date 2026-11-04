import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * Aggregates infrastructure providers so the composition root stays small.
 */
@Module({
  imports: [DatabaseProviderModule],
  exports: [DatabaseProviderModule],
})
export class ProviderModule {}
