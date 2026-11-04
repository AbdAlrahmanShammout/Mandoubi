import { Module } from '@nestjs/common';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';
import { UserPrismaRepository } from '@/modules/user/repository/user-prisma.repository';
import { UserRepository } from '@/modules/user/repository/user.repository';
import { UserService } from '@/modules/user/user.service';

/**
 * Credential accounts. Controllers are registered by audience modules.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [UserService, { provide: UserRepository, useClass: UserPrismaRepository }],
  exports: [UserService],
})
export class UserModule {}
