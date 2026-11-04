import { Injectable } from '@nestjs/common';
import { BaseConfigService } from '@/config/base-config.service';

/**
 * Typed access to API documentation settings.
 */
@Injectable()
export class SwaggerConfigService extends BaseConfigService {
  /**
   * Whether audience OpenAPI documents are served.
   */
  get isEnabled(): boolean {
    const enabled = this.getValue<boolean | string>('swagger.enabled');
    return enabled === true || enabled === 'true';
  }
}
