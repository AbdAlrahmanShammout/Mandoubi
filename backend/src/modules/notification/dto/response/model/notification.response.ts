import { ApiProperty } from '@nestjs/swagger';
import { NotificationEntity } from '@/modules/notification/entity/notification.entity';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationKind } from '@/modules/notification/enum/notification-kind.enum';

/**
 * One in-app notification.
 */
export class NotificationResponse {
  @ApiProperty({ example: 1 })
  readonly id: number;
  @ApiProperty({ enum: NotificationAudience, example: NotificationAudience.PHARMACY })
  readonly audience: NotificationAudience;
  @ApiProperty({ enum: NotificationKind, example: NotificationKind.INVOICE_APPROVED })
  readonly kind: NotificationKind;
  @ApiProperty({ example: 'Invoice approved' })
  readonly title: string;
  @ApiProperty({ example: 'Invoice 1 was approved' })
  readonly body: string;
  @ApiProperty({ example: 'invoice' })
  readonly resourceType: string;
  @ApiProperty({ example: 1 })
  readonly resourceId: number;
  @ApiProperty({ example: null, nullable: true })
  readonly readAt: Date | null;
  @ApiProperty({ example: '2026-11-05T00:00:00.000Z' })
  readonly createdAt: Date;
  constructor(notification: NotificationEntity) {
    this.id = notification.id;
    this.audience = notification.audience;
    this.kind = notification.kind;
    this.title = notification.title;
    this.body = notification.body;
    this.resourceType = notification.resourceType;
    this.resourceId = notification.resourceId;
    this.readAt = notification.readAt;
    this.createdAt = notification.createdAt;
  }
}
