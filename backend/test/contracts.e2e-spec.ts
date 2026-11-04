import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { AppModule } from '@/app.module';
import { createSwaggerDocument } from '@/providers/swagger/swagger-document.factory';
import { SWAGGER_DOCUMENT_DEFINITIONS } from '@/providers/swagger/swagger-document.definitions';

const contractsDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '../contracts');

describe('Audience OpenAPI contracts', () => {
  let app: NestExpressApplication;
  beforeAll(async () => {
    app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('keeps each audience document on its own routes', async () => {
    await mkdir(contractsDirectory, { recursive: true });
    for (const definition of SWAGGER_DOCUMENT_DEFINITIONS) {
      const document = createSwaggerDocument(app, definition);
      const paths = Object.keys(document.paths);
      const foreignPrefixes = SWAGGER_DOCUMENT_DEFINITIONS.filter((item) => item.name !== definition.name).map((item) => item.pathPrefix);
      expect(paths.length).toBeGreaterThan(0);
      expect(paths.every((path) => path.startsWith(definition.pathPrefix))).toBe(true);
      expect(paths.some((path) => foreignPrefixes.some((prefix) => path.startsWith(prefix)))).toBe(false);
      const serialized = `${JSON.stringify(document, null, 2)}\n`;
      const filePath = resolve(contractsDirectory, `${definition.name}.openapi.json`);
      if (process.env.WRITE_OPENAPI === '1') {
        await writeFile(filePath, serialized);
      }
      expect(await readFile(filePath, 'utf8')).toBe(serialized);
    }
  });
});
