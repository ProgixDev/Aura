import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const status = exception.getStatus();
      if (typeof body === 'object' && body !== null && 'status' in (body as object)) {
        return res.status(status).json(body);
      }
      const message =
        typeof body === 'string' ? body : ((body as any).message ?? exception.message);
      return res.status(status).json({ status: 'error', message });
    }
    const err = exception instanceof Error ? exception.message : String(exception);
    return res
      .status(500)
      .json({ status: 'error', message: 'Une erreur est survenue', error: err });
  }
}
