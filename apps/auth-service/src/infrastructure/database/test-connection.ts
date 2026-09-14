import { pool } from './postgres.js';

const testConnection = async (): Promise<void> => {
  try {
    const result = await pool.query('SELECT current_database(), current_user;');

    console.log('Database connection test successful:', result.rows[0]);
  } catch (error) {
    console.error('Database connection test failed:', error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
};

void testConnection();
