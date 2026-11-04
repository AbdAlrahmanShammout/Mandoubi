import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { resolvePrismaClient } from '@/providers/database/prisma/prisma-client.resolver';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { NotificationEntity } from '@/modules/notification/entity/notification.entity';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { CreateNotificationRepoInput, NotificationRepository } from '@/modules/notification/repository/notification.repository';

/**
 * Prisma storage for in-app notifications.
 */
@Injectable()
export class NotificationPrismaRepository extends NotificationRepository {
  constructor(private readonly prisma: PrismaProviderService) {
    super();
  }
  /** Inserts one notification on the given transaction when one is open. */
  async create(input: CreateNotificationRepoInput, context?: TransactionContext): Promise<void> {
    const client = resolvePrismaClient(this.prisma, context);
    await client.notification.create({ data: input });
  }
  /** Lists one audience inbox, newest first. */
  async list(audience: NotificationAudience, audienceId: number | null): Promise<NotificationEntity[]> {
    const results = await this.prisma.notification.findMany({ where: { audience, audienceId }, orderBy: { id: 'desc' } });
    return results.map((result) => toEntity(result));
  }
  /** Marks one owned notification read. */
  async markRead(id: number, audience: NotificationAudience, audienceId: number | null): Promise<boolean> {
    const updated = await this.prisma.notification.updateMany({ where: { id, audience, audienceId, readAt: null }, data: { readAt: new Date() } });
    return updated.count === 1;
  }
}

function toEntity(result: { id: number; audience: string; audienceId: number | null; kind: string; title: string; body: string; resourceType: string; resourceId: number; readAt: Date | null; createdAt: Date }): NotificationEntity {
  const notification = new NotificationEntity();
  notification.id = result.id;
  notification.audience = result.audience as NotificationAudience;
  notification.audienceId = result.audienceId;
  notification.kind = result.kind as NotificationKind;
  notification.title = result.title;
  notification.body = result.body;
  notification.resourceType = result.resourceType;
  notification.resourceId = result.resourceId;
  notification.readAt = result.readAt;
  notification.createdAt = result.createdAt;
  return notification;
}
