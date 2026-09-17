import { FastifyError, FastifyInstance } from 'fastify';
import { AppError } from './app-error.js';

// Register one centralized error handler for all routes.
export const registerErrorHandler = (app: FastifyInstance): void => {
  app.setErrorHandler((error: FastifyError, request, reply) => {
    // Always log the original error for debugging/observability.
    request.log.error(error);

    if (error instanceof AppError){
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      });
    }

    // Fastify validation failures (schema/body/query/params).
    if (error.validation) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Request validation failed',
          details: error.validation,
        },
      });
    }

    // Expected client-side request errors (4xx).
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      return reply.status(error.statusCode).send({
        error: {
          code: 'REQUEST_ERROR',
          message: error.message,
          details: null,
        },
      });
    }

    // Fallback for unexpected server errors.
    return reply.status(500).send({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
        details: null,
      },
    });
  });
};
