import { Injectable, Logger } from '@nestjs/common';
import { DependencyFailureException } from '@/common/exceptions/dependency-failure.exception';
import { PrismaProviderService } from '@/providers/database/prisma/prisma-provider.service';
import { HealthStatus } from './health-status';

const READINESS_TIMEOUT_MS = 1000;

/**
 * Answers liveness without I/O and readiness with a short database check.
 */
@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  constructor(private readonly prisma: PrismaProviderService) {}
  /**
   * Reports that the process event loop is alive.
   */
  checkLiveness(): HealthStatus {
    return { status: 'ok' };
  }
  /**
   * Reports that the database accepted a trivial query before the timeout.
   */
  async checkReadiness(): Promise<HealthStatus> {
    try {
      await this.withTimeout(this.prisma.$queryRaw`SELECT 1`);
    } catch (error) {
      this.logger.error(error instanceof Error ? error.message : 'Readiness check failed');
      throw new DependencyFailureException('The service is not ready');
    }
    return { status: 'ok' };
  }
  private async withTimeout(query: Promise<unknown>): Promise<void> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => {
        reject(new DependencyFailureException('The service is not ready'));
      }, READINESS_TIMEOUT_MS);
    });
    try {
      await Promise.race([query, timeout]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
