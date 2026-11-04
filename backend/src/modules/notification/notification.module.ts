import { Module } from '@nestjs/common';
import { NotificationService } from '@/modules/notification/notification.service';
import { NotificationPrismaRepository } from '@/modules/notification/repository/notification-prisma.repository';
import { NotificationRepository } from '@/modules/notification/repository/notification.repository';
import { DatabaseProviderModule } from '@/providers/database/database-provider.module';

/**
 * In-app notifications. It imports no domain module.
 */
@Module({
  imports: [DatabaseProviderModule],
  providers: [NotificationService, { provide: NotificationRepository, useClass: NotificationPrismaRepository }],
  exports: [NotificationService],
})
export class NotificationModule {}
