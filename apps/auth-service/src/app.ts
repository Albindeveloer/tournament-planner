import Fastify from 'fastify';
import { registerErrorHandler } from './middleware/error-handler';
import { authRoutes } from './modules/auth/auth.route.js';

export const buildApp = () => {
  // Create Fastify app with built-in request logging enabled.
  const app = Fastify({
    logger: true,
  });

  // Attach centralized error handling once during app setup.
  registerErrorHandler(app);

  // Register auth routes
  app.register(authRoutes, { prefix: 'api/v1/auth' });

  // Basic health endpoint for local/dev checks and uptime probes.
  app.get('/health', async (request, reply) => {
    return {
      data: {
        service: 'auth-service',
        status: 'ok',
      },
    };
  });

  return app;
};
