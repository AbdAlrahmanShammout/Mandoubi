import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Response } from 'express';
import { AppConfigService } from '@/config/app/app-config.service';
import { ErrorKind } from '@/common/exceptions/error-kind.enum';
import { normalizeException } from '@/common/filter/exception_mappers/exception-mapper';
import { writeHttpException } from '@/common/filter/exception_return_handler/http-exception.handler';
import { GeneralTypeException } from '@/common/filter/exception_return_handler/type/general-type.exception';

/**
 * Last-resort filter. Unrecognized errors become a generic 500.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);
  constructor(private readonly appConfig: AppConfigService) {}
  /**
   * Logs the failure, hides internals outside development, and writes the body.
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const normalized = this.prepareException(normalizeException(exception));
    this.logException(exception, normalized);
    const response = host.switchToHttp().getResponse<Response>();
    if (response.headersSent) {
      return;
    }
    writeHttpException(response, normalized, {
      exposeMessage: normalized.userFriendly || this.appConfig.isDevelopment,
      exposeStack: this.appConfig.isDevelopment,
    });
  }
  private prepareException(exception: GeneralTypeException): GeneralTypeException {
    if (exception.userFriendly || this.appConfig.isDevelopment) {
      return exception;
    }
    if (exception.statusCode < HttpStatus.INTERNAL_SERVER_ERROR) {
      return new GeneralTypeException({
        message: 'The requested record was not found',
        code: 'RESOURCE_NOT_FOUND',
        kind: ErrorKind.NOT_FOUND,
        userFriendly: false,
        statusCode: HttpStatus.NOT_FOUND,
      });
    }
    return new GeneralTypeException({
      message: 'An unexpected error occurred',
      code: 'INTERNAL',
      kind: ErrorKind.INTERNAL,
      userFriendly: false,
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
    });
  }
  private logException(original: unknown, normalized: GeneralTypeException): void {
    const stack = original instanceof Error ? original.stack : undefined;
    if (normalized.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR || !normalized.userFriendly) {
      this.logger.error(`${normalized.code} ${normalized.message}`, stack);
      return;
    }
    this.logger.warn(`${normalized.code} ${normalized.message}`);
  }
}
