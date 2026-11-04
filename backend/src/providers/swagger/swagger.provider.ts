import { INestApplication } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { SwaggerConfigService } from '@/config/swagger/swagger-config.service';
import { SWAGGER_UI_ROOT } from '@/providers/swagger/consts';
import { createSwaggerDocument } from '@/providers/swagger/swagger-document.factory';
import { SWAGGER_DOCUMENT_DEFINITIONS } from '@/providers/swagger/swagger-document.definitions';

/**
 * Registers audience OpenAPI documents when documentation is enabled.
 */
export class SwaggerProvider {
  /**
   * Mounts one UI route per audience. Does nothing when documentation is disabled.
   */
  static setup(app: INestApplication, config: SwaggerConfigService): void {
    if (!config.isEnabled) {
      return;
    }
    for (const definition of SWAGGER_DOCUMENT_DEFINITIONS) {
      const document = createSwaggerDocument(app, definition);
      SwaggerModule.setup(`${SWAGGER_UI_ROOT}/${definition.name}`, app, document, {
        jsonDocumentUrl: definition.jsonPath,
      });
    }
  }
}
