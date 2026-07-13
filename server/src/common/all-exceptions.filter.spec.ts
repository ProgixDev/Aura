import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function fakeHost() {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const res = { status, json };
  const host = {
    switchToHttp: () => ({
      getResponse: () => res,
      getRequest: () => ({}),
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    jest.restoreAllMocks();
  });

  it('passes through an already-shaped error envelope unchanged', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = fakeHost();
    const body = { status: 'error', message: 'nope', errors: { foo: ['bad'] } };
    const exception = new HttpException(body, HttpStatus.UNPROCESSABLE_ENTITY);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(422);
    expect(json).toHaveBeenCalledWith(body);
  });

  it('wraps a plain string/unshaped HttpException response via fail()', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = fakeHost();
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Not Found',
    });
  });

  it('wraps an HttpException response object lacking a status key via fail()', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = fakeHost();
    const exception = new HttpException(
      { message: 'Bad input' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Bad input',
    });
  });

  it('returns a generic 500 and logs, including error detail outside production', () => {
    process.env.NODE_ENV = 'test';
    const loggerSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const filter = new AllExceptionsFilter();
    const { host, status, json } = fakeHost();
    const exception = new Error('boom');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Une erreur est survenue',
      error: 'boom',
    });
    expect(loggerSpy).toHaveBeenCalledWith(exception);
  });

  it('does not leak the raw error message in production', () => {
    process.env.NODE_ENV = 'production';
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const filter = new AllExceptionsFilter();
    const { host, status, json } = fakeHost();
    const exception = new Error('boom');

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      status: 'error',
      message: 'Une erreur est survenue',
    });
  });
});
