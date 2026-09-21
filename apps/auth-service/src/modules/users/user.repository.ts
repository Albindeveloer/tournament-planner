import { pool} from '../../infrastructure/database/postgres.js';

export type User = {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string | null;
  status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';
  email_verified: boolean;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export class UserRepository {
    async findByEmail(email: string): Promise<User | null> {
        const result = await pool.query<User>(
            `SELECT id, email, password_hash, first_name, last_name, status, email_verified, last_login_at, created_at, updated_at
            FROM users
            WHERE Lower(email) = Lower($1)`,
            [email]
        );

        return result.rows[0] || null;
    }

    async findById(id: string): Promise<User | null> {
        const result = await pool.query<User>(
            `SELECT id, email, password_hash, first_name, last_name, status, email_verified, last_login_at, created_at, updated_at
            FROM users
            WHERE id = $1`,
            [id],
        );
        return result.rows[0] ?? null;
    }

    async createUser(params: {
        email: string;
        passwordHash: string;
        firstName: string;
        lastName: string | null;
    }): Promise<User> {
        const result = await pool.query<User>(
            `INSERT INTO users (email, password_hash, first_name, last_name)
            VALUES ($1, $2, $3, $4)
            RETURNING id, email, password_hash, first_name, last_name, status, email_verified, last_login_at, created_at, updated_at`,
            [params.email, params.passwordHash, params.firstName, params.lastName],
        );

        const user = result.rows[0];
        if (!user) {
            throw new Error('Failed to create user');
        }

        return user;
    }
}

export const userRepository = new UserRepository();