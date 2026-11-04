import { Controller, Get, HttpCode, HttpStatus, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoggedInUser } from '@/common/decorators/requests/logged-in-user.decorator';
import { Roles } from '@/common/decorators/route/roles.decorator';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Principal } from '@/common/auth/principal.interface';
import { UnauthenticatedException } from '@/common/exceptions/unauthenticated.exception';
import { NotificationResponse } from '@/modules/notification/dto/response/model/notification.response';
import { NotificationAudience } from '@/modules/notification/enum/notification-audience.enum';
import { NotificationService } from '@/modules/notification/notification.service';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Inbox for the signed-in driver.
 */
@ApiTags('Driver notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(AccountRole.DRIVER)
@Controller('driver/notifications')
export class NotificationDriverController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}
  /**
   * Lists notifications for the signed-in driver.
   */
  @Get()
  @ApiOperation({ summary: 'List driver notifications' })
  async list(@LoggedInUser() currentUser: Principal): Promise<NotificationResponse[]> {
    const driverId = await this.readDriverId(currentUser.id);
    const notifications = await this.notificationService.list(NotificationAudience.DRIVER, driverId);
    return notifications.map((notification) => new NotificationResponse(notification));
  }
  /**
   * Marks one driver notification as read.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a driver notification as read' })
  async markRead(@LoggedInUser() currentUser: Principal, @Param('id', ParseIntPipe) id: number): Promise<NotificationResponse> {
    const driverId = await this.readDriverId(currentUser.id);
    const notification = await this.notificationService.markRead(id, NotificationAudience.DRIVER, driverId);
    return new NotificationResponse(notification);
  }
  private async readDriverId(userId: number): Promise<number> {
    const user = await this.userService.getUserById(userId);
    return requireDriverId(user);
  }
}

function requireDriverId(user: UserEntity): number {
  if (user.driverId === null) {
    throw new UnauthenticatedException();
  }
  return user.driverId;
}
