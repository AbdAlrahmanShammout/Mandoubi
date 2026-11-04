import { Type } from '@nestjs/common';
import { AdminApiModule } from '@/modules/admin-api.module';
import { DriverApiModule } from '@/modules/driver-api.module';
import { PharmacyApiModule } from '@/modules/pharmacy-api.module';
import { ADMIN_SWAGGER_JSON_PATH, DRIVER_SWAGGER_JSON_PATH, PHARMACY_SWAGGER_JSON_PATH } from '@/providers/swagger/consts';

/**
 * One OpenAPI document for one API audience.
 */
export interface SwaggerDocumentDefinition {
  readonly name: string;
  readonly titleSuffix: string;
  readonly description: string;
  readonly jsonPath: string;
  readonly pathPrefix: string;
  readonly include: readonly Type<unknown>[];
  readonly hasBearerAuth: boolean;
}

/**
 * Extension table. A new audience is one new entry.
 */
export const SWAGGER_DOCUMENT_DEFINITIONS: readonly SwaggerDocumentDefinition[] = [
  {
    name: 'admin',
    titleSuffix: 'Admin API',
    description: 'Endpoints used by the admin dashboard.',
    jsonPath: ADMIN_SWAGGER_JSON_PATH,
    pathPrefix: '/admin',
    include: [AdminApiModule],
    hasBearerAuth: true,
  },
  {
    name: 'pharmacy',
    titleSuffix: 'Pharmacy API',
    description: 'Endpoints used by the pharmacy mobile app.',
    jsonPath: PHARMACY_SWAGGER_JSON_PATH,
    pathPrefix: '/pharmacy',
    include: [PharmacyApiModule],
    hasBearerAuth: true,
  },
  {
    name: 'driver',
    titleSuffix: 'Driver API',
    description: 'Endpoints used by the delivery mobile app.',
    jsonPath: DRIVER_SWAGGER_JSON_PATH,
    pathPrefix: '/driver',
    include: [DriverApiModule],
    hasBearerAuth: true,
  },
];
