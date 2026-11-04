import { Module } from '@nestjs/common';
import { PrismaProviderModule } from '@/providers/database/prisma/prisma-provider.module';

/**
 * Technology-neutral database grouping. Swap the ORM by changing this import.
 */
@Module({
  imports: [PrismaProviderModule],
  exports: [PrismaProviderModule],
})
export class DatabaseProviderModule {}
