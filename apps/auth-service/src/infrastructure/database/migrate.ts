import fs from 'node:fs/promises';
import path from 'node:path';

import { pool } from './postgres.js';

const migrationsDirectory = path.resolve(
  __dirname,
  '../../../migrations',
);

const runMigrations = async (): Promise<void> => {
  // 1) Connect to auth_db using the shared Postgres pool.
  const client = await pool.connect();

  try {
    // 7) Run all migration work in a single transaction.
    await client.query('BEGIN');

    // 2) Ensure the migrations tracking table exists.
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3) Find all SQL migration files.
    const files = await fs.readdir(migrationsDirectory);

    const migrationFiles = files
      .filter((file) => file.endsWith('.sql'))
      .sort();

    // 4) Load already applied migrations from the tracking table.
    const appliedResult = await client.query<{ id: string }>(
      'SELECT id FROM schema_migrations ORDER BY id',
    );

    const appliedMigrations = new Set(
      appliedResult.rows.map((row) => row.id),
    );

    // 5) Execute pending migrations in filename order.
    for (const migrationFile of migrationFiles) {
      if (appliedMigrations.has(migrationFile)) {
        console.log(`Skipping already applied migration: ${migrationFile}`);
        continue;
      }

      const migrationPath = path.join(
        migrationsDirectory,
        migrationFile,
      );

      const migrationSql = await fs.readFile(migrationPath, 'utf-8');

      console.log(`Applying migration: ${migrationFile}`);

      await client.query(migrationSql);

      // 6) Record each successfully applied migration.
      await client.query(
        `
          INSERT INTO schema_migrations (id)
          VALUES ($1);
        `,
        [migrationFile],
      );

      console.log(`Migration applied: ${migrationFile}`);
    }

    await client.query('COMMIT');

    console.log('Database migrations completed successfully.');
  } catch (error) {
    // 7) Roll back everything if any migration fails.
    await client.query('ROLLBACK');

    console.error('Database migration failed:', error);

    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
};

void runMigrations();