import { Injectable } from '@nestjs/common';
import { BaseConfigService } from '@/config/base-config.service';

/**
 * Typed access to the bootstrap administrator credential.
 */
@Injectable()
export class AdminConfigService extends BaseConfigService {
  /**
   * Mobile number of the administrator created when none exists.
   */
  get mobileNumber(): string {
    return this.getValue<string>('admin.mobileNumber');
  }
  /**
   * Initial password of the bootstrap administrator.
   */
  get password(): string {
    return this.getValue<string>('admin.password');
  }
}
