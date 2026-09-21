import { FastifyInstance } from 'fastify';
import { registerUser, loginUser, refreshToken, logout } from './auth.controller.js';

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
  app.post(
    '/register',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password', 'first_name'],
          additionalProperties: false,
          properties: {
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
            first_name: { type: 'string', minLength: 1, maxLength: 100 },
            last_name: { type: 'string', maxLength: 100 },
          },
        },
      },
    },
    registerUser,
  );

  app.post(
    '/login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'password'],
          additionalProperties: false,
          properties: {
            email: { type: 'string', format: 'email', maxLength: 255 },
            password: { type: 'string', minLength: 8, maxLength: 128 },
          },
        },
      },
    },
    loginUser,
  );

  app.post(
    '/refresh',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refresh_token'],
          additionalProperties: false,
          properties: {
            refresh_token: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    refreshToken,
  );

  app.post(
    '/logout',
    {
      schema: {
        body: {
          type: 'object',
          required: ['refresh_token'],
          additionalProperties: false,
          properties: {
            refresh_token: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    logout,
  );
};
