import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { Response } from 'express';
import { ValidationExceptions } from '@/common/exceptions/validation.exception';
import { normalizeException } from '@/common/filter/exception_mappers/exception-mapper';
import { writeHttpException } from '@/common/filter/exception_return_handler/http-exception.handler';

/**
 * Writes field errors for request-validation failures.
 */
@Catch(ValidationExceptions)
export class ValidationExceptionFilter implements ExceptionFilter {
  /**
   * Serializes validation failures with their field messages.
   */
  catch(exception: ValidationExceptions, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    writeHttpException(response, normalizeException(exception), { exposeMessage: true, exposeStack: false });
  }
}
