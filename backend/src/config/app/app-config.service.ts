import { Injectable } from '@nestjs/common';
import { BaseConfigService } from '@/config/base-config.service';
import { Environment } from '@/config/environment';

const ORIGIN_SEPARATOR = ',';

/**
 * Typed access to application process settings.
 */
@Injectable()
export class AppConfigService extends BaseConfigService {
  /**
   * Active environment kind.
   */
  get environment(): Environment {
    return this.getValue<Environment>('app.environment');
  }
  /**
   * HTTP listen port.
   */
  get port(): number {
    return Number(this.getValue<string | number>('app.port'));
  }
  /**
   * Explicit browser origins allowed to call the API.
   */
  get allowedOrigins(): readonly string[] {
    return this.getValue<string>('app.allowedOrigins')
      .split(ORIGIN_SEPARATOR)
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0);
  }
  /**
   * Maximum accepted JSON body size.
   */
  get bodySizeLimit(): string {
    return this.getValue<string>('app.bodySizeLimit');
  }
  /**
   * Whether detailed local diagnostics are appropriate.
   */
  get isDevelopment(): boolean {
    return this.environment === Environment.DEVELOPMENT;
  }
}
