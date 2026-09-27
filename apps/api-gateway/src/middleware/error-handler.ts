import { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from './app-error.js';

// Network errors that mean an upstream service is unreachable.
// Also includes undici internal codes since @fastify/reply-from uses undici under the hood.
const UPSTREAM_NETWORK_ERRORS = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'UND_ERR_SOCKET',
  'UND_ERR_CONNECT_TIMEOUT',
]);

// @fastify/reply-from wraps raw Node/undici errors in its own error classes (e.g.
// InternalServerError with code FST_REPLY_FROM_INTERNAL_SERVER_ERROR) and attaches the
// original error as `cause`. Check the wrapper code first; if it is not a network code,
// fall through to the cause so we still catch ECONNREFUSED on the inner error.
const getNetworkErrorCode = (error: FastifyError): string => {
  const topCode = 'code' in error && typeof error.code === 'string' ? error.code : '';
  if (UPSTREAM_NETWORK_ERRORS.has(topCode)) return topCode;
  const cause = (error as { cause?: unknown }).cause;
  if (cause !== null && cause !== undefined && typeof (cause as { code?: unknown }).code === 'string') {
    return (cause as { code: string }).code;
  }
  return '';
};

export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    request.log.error(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    if (error.statusCode === 429) {
      return reply.status(429).send({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
          details: null,
        },
      });
    }

    if (UPSTREAM_NETWORK_ERRORS.has(getNetworkErrorCode(error))) {
      return reply.status(503).send({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'The requested service is currently unavailable',
          details: null,
        },
      });
    }

    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
    }

    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: {
          code: 'REQUEST_ERROR',
          message: error.message,
          details: null,
        },
      });
    }

    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: null,
      },
    });
  });

  // Prevent Fastify's default "Route X not found" from leaking internal routing details.
  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({
      error: {
        code: 'NOT_FOUND',
        message: 'The requested resource does not exist',
        details: null,
      },
    });
  });
};
