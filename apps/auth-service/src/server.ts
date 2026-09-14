import { buildApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './infrastructure/database/postgres.js';

const start = async (): Promise<void> => {
  const app = buildApp();

  // Graceful shutdown closes HTTP server first, then DB connections.
  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}. shutting down gracefully...`);

    try {
      await app.close();
      await pool.end();

      app.log.info('Auth service shutdown successfully.');
      process.exit(0);
    } catch (error) {
      app.log.error(error, 'Error during shutdown');
      process.exit(1);
    }
  };

  // Listen for termination signals from terminal/container/orchestrator.
  process.on('SIGINT', () => {
    void shutdown('SIGINT');
  });
  process.on('SIGTERM', () => {
    void shutdown('SIGTERM');
  });

  try {
    // Start accepting incoming requests.
    await app.listen({ port: env.port, host: '0.0.0.0' });
    app.log.info(`Auth service listening on port ${env.port}`);
  } catch (err) {
    // Startup failed; release DB pool before exiting.
    app.log.error(err);
    await pool.end();
    process.exit(1);
  }
};

void start();
