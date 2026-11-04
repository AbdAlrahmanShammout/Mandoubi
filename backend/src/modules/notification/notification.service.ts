import { Injectable } from '@nestjs/common';
import { TransactionContext } from '@/common/base/transaction-context';
import { ResourceNotFoundException } from '@/common/exceptions/resource-not-found.exception';
import { NotificationEntity } from '@/modules/notification/entity/notification.entity';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';
import { NotificationRepository } from '@/modules/notification/repository/notification.repository';

/**
 * In-app message created with a business event.
 */
export interface NotifyInput {
  readonly audience: NotificationAudience;
  readonly audienceId: number | null;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly resourceType: string;
  readonly resourceId: number;
}

/**
 * Stores and reads in-app notifications. It does not send push messages.
 */
@Injectable()
export class NotificationService {
  constructor(private readonly notificationRepository: NotificationRepository) {}
  /**
   * Stores one notification. Pass the open transaction so it commits with the event.
   */
  async notify(input: NotifyInput, context?: TransactionContext): Promise<void> {
    await this.notificationRepository.create(input, context);
  }
  /**
   * Lists the inbox of one audience, newest first.
   */
  async list(audience: NotificationAudience, audienceId: number | null): Promise<NotificationEntity[]> {
    return this.notificationRepository.list(audience, audienceId);
  }
  /**
   * Marks one notification read for its owner.
   */
  async markRead(id: number, audience: NotificationAudience, audienceId: number | null): Promise<NotificationEntity> {
    const marked = await this.notificationRepository.markRead(id, audience, audienceId);
    if (!marked) {
      throw new ResourceNotFoundException('Notification', id);
    }
    const inbox = await this.notificationRepository.list(audience, audienceId);
    const notification = inbox.find((item) => item.id === id);
    if (!notification) {
      throw new ResourceNotFoundException('Notification', id);
    }
    return notification;
  }
}
