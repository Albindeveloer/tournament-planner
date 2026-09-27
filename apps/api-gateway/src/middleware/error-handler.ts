import { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from './app-error.js';

// Network errors that mean an upstream service is unreachable.
// ECONNREFUSED: port not open, ECONNRESET/ECONNABORTED: connection dropped mid-stream,
// ETIMEDOUT: TCP timeout, ENOTFOUND: DNS lookup failed (bad service URL or network).
const UPSTREAM_NETWORK_ERRORS = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ECONNABORTED',
  'ETIMEDOUT',
  'ENOTFOUND',
]);

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

    if (
      'code' in error &&
      typeof error.code === 'string' &&
      UPSTREAM_NETWORK_ERRORS.has(error.code)
    ) {
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
        message: 'The requested resource was not found',
        details: null,
      },
    });
  });
};
