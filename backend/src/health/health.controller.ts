import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthService } from './health.service';
import { HealthStatus } from './health-status';

/**
 * Process probes. Liveness stays free of I/O; readiness checks the database.
 */
@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}
  /**
   * Liveness probe for the process supervisor.
   */
  @Get('live')
  @ApiOperation({ summary: 'Process liveness' })
  @ApiOkResponse({ description: 'The process is alive' })
  checkLiveness(): HealthStatus {
    return this.healthService.checkLiveness();
  }
  /**
   * Readiness probe for the load balancer.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Service readiness' })
  @ApiOkResponse({ description: 'The service can accept traffic' })
  checkReadiness(): Promise<HealthStatus> {
    return this.healthService.checkReadiness();
  }
}
