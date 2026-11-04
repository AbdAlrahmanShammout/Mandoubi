import { Module } from '@nestjs/common';
import { AdminApiModule } from './admin-api.module';
import { DriverApiModule } from './driver-api.module';
import { PharmacyApiModule } from './pharmacy-api.module';

/**
 * Aggregates audience API modules for the composition root.
 */
@Module({
  imports: [AdminApiModule, PharmacyApiModule, DriverApiModule],
})
export class FeatureBundleModule {}
