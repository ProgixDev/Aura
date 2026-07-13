import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { fail } from './envelope';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      if (
        typeof body === 'object' &&
        body !== null &&
        'status' in body &&
        body.status === 'error'
      ) {
        return res.status(status).json(body);
      }
      const message =
        typeof body === 'string'
          ? body
          : this.extractMessage(body, exception.message);
      return res.status(status).json(fail(message));
    }
    this.logger.error(exception);
    const err =
      exception instanceof Error ? exception.message : String(exception);
    if (process.env.NODE_ENV !== 'production') {
      return res
        .status(500)
        .json(fail('Une erreur est survenue', { error: err }));
    }
    return res.status(500).json(fail('Une erreur est survenue'));
  }

  private extractMessage(body: object, fallback: string): string {
    const m = (body as { message?: unknown }).message;
    return typeof m === 'string' ? m : fallback;
  }
}
