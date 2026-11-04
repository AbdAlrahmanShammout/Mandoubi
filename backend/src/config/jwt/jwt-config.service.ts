import { Injectable } from '@nestjs/common';
import { BaseConfigService } from '@/config/base-config.service';

/**
 * Typed access to JWT signing settings.
 */
@Injectable()
export class JwtConfigService extends BaseConfigService {
  /**
   * Secret used to sign access tokens.
   */
  get accessSecret(): string {
    return this.getValue<string>('jwt.accessSecret');
  }
  /**
   * Access-token lifetime accepted by the signing library.
   */
  get accessExpiresIn(): string {
    return this.getValue<string>('jwt.accessExpiresIn');
  }
  /**
   * Issuer claim written into access tokens.
   */
  get issuer(): string {
    return this.getValue<string>('jwt.issuer');
  }
}
