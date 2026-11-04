import { TransactionContext } from '@/common/base/transaction-context';
import { NotificationEntity } from '@/modules/notification/entity/notification.entity';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';

/**
 * In-app message written with the event that caused it.
 */
export interface CreateNotificationRepoInput {
  readonly audience: NotificationAudience;
  readonly audienceId: number | null;
  readonly kind: NotificationKind;
  readonly title: string;
  readonly body: string;
  readonly resourceType: string;
  readonly resourceId: number;
}

/**
 * Persistence contract for in-app notifications.
 */
export abstract class NotificationRepository {
  /** Inserts one notification. */
  abstract create(input: CreateNotificationRepoInput, context?: TransactionContext): Promise<void>;
  /** Lists one audience inbox, newest first. */
  abstract list(audience: NotificationAudience, audienceId: number | null): Promise<NotificationEntity[]>;
  /** Marks one notification read when it belongs to the audience. Returns false when it does not. */
  abstract markRead(id: number, audience: NotificationAudience, audienceId: number | null): Promise<boolean>;
}
