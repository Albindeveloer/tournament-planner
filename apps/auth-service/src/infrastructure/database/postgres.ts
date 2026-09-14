import { Pool } from 'pg';
import { env } from '../../config/env.js';

// Shared connection pool for this service process.
// Reusing one Pool avoids creating a new DB connection per request
// and lets pg manage connection limits/timeouts efficiently.
export const pool = new Pool({
  connectionString: env.databaseUrl,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});
