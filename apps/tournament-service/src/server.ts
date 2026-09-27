import { buildApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './infrastructure/database/postgres.js';

const start = async (): Promise<void> => {
  const app = buildApp();

  const shutdown = async (signal: string): Promise<void> => {
    app.log.info(`Received ${signal}. Shutting down gracefully...`);

    try {
      await app.close();
      await pool.end();

      app.log.info('Tournament service shutdown successfully.');
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
    app.log.info(`Tournament service listening on port ${env.port}`);
  } catch (err) {
    app.log.error(err);
    await pool.end();
    process.exit(1);
  }
};

void start();
