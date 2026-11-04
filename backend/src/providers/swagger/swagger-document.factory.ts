import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, OpenAPIObject, SwaggerModule } from '@nestjs/swagger';
import { SwaggerDocumentDefinition } from '@/providers/swagger/swagger-document.definitions';

/**
 * Builds one OpenAPI document from a single audience module.
 */
export function createSwaggerDocument(app: INestApplication, definition: SwaggerDocumentDefinition): OpenAPIObject {
  const builder = new DocumentBuilder()
    .setTitle(`Pharmacy Distribution — ${definition.titleSuffix}`)
    .setDescription(definition.description)
    .setVersion('1.0');
  if (definition.hasBearerAuth) {
    builder.addBearerAuth();
  }
  return SwaggerModule.createDocument(app, builder.build(), {
    include: [...definition.include],
  });
}
