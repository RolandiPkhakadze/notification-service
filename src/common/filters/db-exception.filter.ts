import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

@Catch(QueryFailedError)
export class DbExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DbExceptionFilter.name);

  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let mapped: ConflictException | NotFoundException;

    switch (exception.code) {
      case '23505': // unique_violation
        mapped = new ConflictException('Resource already exists');
        break;
      case '23503': // foreign_key_violation
        mapped = new NotFoundException('Referenced resource not found');
        break;
      case '23502': // not_null_violation
        mapped = new ConflictException('Missing required field');
        break;
      default:
        this.logger.error(
          `${request.method} ${request.url} → DB error [${exception.code}]`,
          exception.stack,
        );
        response.status(500).json({
          statusCode: 500,
          timestamp: new Date().toISOString(),
          path: request.url,
          message: 'Internal server error',
        });
        return;
    }

    const status = mapped.getStatus();
    this.logger.warn(
      `${request.method} ${request.url} → ${status}: ${mapped.message}`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: mapped.message,
    });
  }
}
