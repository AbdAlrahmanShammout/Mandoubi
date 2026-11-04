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
import { PharmacySessionGuard } from '@/modules/pharmacy/guards/pharmacy-session.guard';
import { AccountRole } from '@/modules/user/enum/account-role.enum';
import { UserEntity } from '@/modules/user/entity/user.entity';
import { JwtAuthGuard } from '@/modules/user/guards/jwt-auth.guard';
import { UserService } from '@/modules/user/user.service';

/**
 * Inbox for the signed-in pharmacy.
 */
@ApiTags('Pharmacy notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PharmacySessionGuard, RolesGuard)
@Roles(AccountRole.PHARMACY)
@Controller('pharmacy/notifications')
export class NotificationPharmacyController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly userService: UserService,
  ) {}
  /**
   * Lists notifications for the signed-in pharmacy.
   */
  @Get()
  @ApiOperation({ summary: 'List pharmacy notifications' })
  async list(@LoggedInUser() currentUser: Principal): Promise<NotificationResponse[]> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const notifications = await this.notificationService.list(NotificationAudience.PHARMACY, pharmacyId);
    return notifications.map((notification) => new NotificationResponse(notification));
  }
  /**
   * Marks one pharmacy notification as read.
   */
  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a pharmacy notification as read' })
  async markRead(@LoggedInUser() currentUser: Principal, @Param('id', ParseIntPipe) id: number): Promise<NotificationResponse> {
    const pharmacyId = await this.readPharmacyId(currentUser.id);
    const notification = await this.notificationService.markRead(id, NotificationAudience.PHARMACY, pharmacyId);
    return new NotificationResponse(notification);
  }
  private async readPharmacyId(userId: number): Promise<number> {
    const user = await this.userService.getUserById(userId);
    return requirePharmacyId(user);
  }
}

function requirePharmacyId(user: UserEntity): number {
  if (user.pharmacyId === null) {
    throw new UnauthenticatedException();
  }
  return user.pharmacyId;
}
