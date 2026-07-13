import { UnprocessableEntityException, ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export function formatValidationErrors(
  errors: ValidationError[],
  parent = '',
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const e of errors) {
    const path = parent ? `${parent}.${e.property}` : e.property;
    if (e.constraints) out[path] = Object.values(e.constraints);
    if (e.children?.length)
      Object.assign(out, formatValidationErrors(e.children, path));
  }
  return out;
}

export function buildValidationPipe() {
  return new ValidationPipe({
    whitelist: true,
    transform: true,
    transformOptions: { enableImplicitConversion: true },
    exceptionFactory: (errors) =>
      new UnprocessableEntityException({
        status: 'error',
        message: 'Erreur de validation',
        errors: formatValidationErrors(errors),
      }),
  });
}
