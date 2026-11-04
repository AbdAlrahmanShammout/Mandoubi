import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { NotificationResponse } from '@/modules/notification/dto/response/model/notification.response';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';

/**
 * Shared admin inbox.
 */
@ApiTags('Admin notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.ADMIN)
@Controller('admin/notifications')
export class NotificationAdminController {
  constructor(private readonly notificationService: NotificationService) {}
  /**
   * Lists notifications addressed to the administration.
   */
  @Get()
  @ApiOperation({ summary: 'List admin notifications' })
  async list(): Promise<NotificationResponse[]> {
    const notifications = await this.notificationService.list(NotificationAudience.ADMIN, null);
    return notifications.map((notification) => new NotificationResponse(notification));
  }
  /**
   * Marks one admin notification as read.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark an admin notification as read' })
  async markRead(@Param('id', ParseIntPipe) id: number): Promise<NotificationResponse> {
    const notification = await this.notificationService.markRead(id, NotificationAudience.ADMIN, null);
    return new NotificationResponse(notification);
  }
}
