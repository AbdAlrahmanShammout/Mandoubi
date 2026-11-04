import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Owns the Prisma client connection lifecycle.
 */
@Injectable()
export class PrismaProviderService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaProviderService.name);
  /**
   * Opens the database connection when the module starts.
   */
  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Database connection is open');
  }
  /**
   * Closes the database connection when the module stops.
   */
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Database connection is closed');
  }
}
