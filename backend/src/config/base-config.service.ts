import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Shared typed accessor. Every concern config service extends this class.
 */
@Injectable()
export class BaseConfigService {
  constructor(private readonly configService: ConfigService) {}
  /**
   * Reads a namespaced configuration value and fails immediately when the path is missing.
   */
  getValue<T>(key: string): T {
    const value = this.configService.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing configuration key: ${key}`);
    }
    return value;
  }
}
