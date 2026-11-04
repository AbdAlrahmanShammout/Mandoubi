import { Injectable } from '@nestjs/common';
import { BaseConfigService } from '@/config/base-config.service';

/**
 * Typed access to the database connection string.
 */
@Injectable()
export class DatabaseConfigService extends BaseConfigService {
  /**
   * PostgreSQL connection URL.
   */
  get url(): string {
    return this.getValue<string>('database.url');
  }
}
