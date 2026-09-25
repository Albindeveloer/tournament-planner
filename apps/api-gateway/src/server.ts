import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async (): Promise<void> => {
  const app = await buildApp();

  // Graceful shutdown — close Fastify cleanly on termination signals.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);

    try {
      await app.close();
      app.log.info('API Gateway shutdown successfully.');
      process.exit(0);
    } catch (error) {
      app.log.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    await app.listen({ port: env.port, host: '0.0.0.0' });
    app.log.info(`API Gateway listening on port ${env.port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

void start();
