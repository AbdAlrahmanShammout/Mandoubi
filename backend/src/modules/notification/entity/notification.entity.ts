import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';

/**
 * In-app message for one audience.
 */
export class NotificationEntity {
  id!: number;
  audience!: NotificationAudience;
  audienceId!: number | null;
  kind!: NotificationKind;
  title!: string;
  body!: string;
  resourceType!: string;
  resourceId!: number;
  readAt!: Date | null;
  createdAt!: Date;
}
