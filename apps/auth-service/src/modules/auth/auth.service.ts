import { hashPassword, verifyPassword } from "./password.js";
import { userRepository, User } from "../users/user.repository.js";
import { AppError } from "../../middleware/app-error.js";

export type RegisterUserInput = {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
};

export type LoginInput = {
    email: string;
    password: string;
};

export type SafeUser = Omit<User, 'password_hash'>;

export class AuthService {
    async loginUser(input: LoginInput): Promise<SafeUser> {
        const email = input.email.trim().toLowerCase();
        const user = await userRepository.findByEmail(email);

        // Same error for unknown email and wrong password — prevents account enumeration.
        if (!user) {
            throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
        }

        const passwordValid = await verifyPassword(input.password, user.password_hash);
        if (!passwordValid) {
            throw new AppError('INVALID_CREDENTIALS', 401, 'Invalid email or password');
        }

        if (user.status !== 'ACTIVE') {
            throw new AppError('ACCOUNT_INACTIVE', 403, 'Your account is not active');
        }

        const { password_hash: _, ...safeUser } = user;
        return safeUser;
    }

    async registerUser(input: RegisterUserInput): Promise<SafeUser> {
        const email = input.email.trim().toLowerCase();
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new AppError('EMAIL_ALREADY_EXISTS', 409, 'An account with this email already exists');
        }
        const passwordHash = await hashPassword(input.password);

        try {
        const user = await userRepository.createUser({
            email,
            passwordHash,
            firstName: input.first_name.trim(),
            lastName: input.last_name?.trim() || null,
        });

        const { password_hash: _passwordHash, ...safeUser } = user;
        return safeUser;
        } catch (error: unknown) {
            if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            throw new AppError('EMAIL_ALREADY_EXISTS', 409, 'An account with this email already exists');
            }
            throw error;
        }
    }
}

export const authService = new AuthService();

// Repository
// knows: How to intract with the PostgreSQL.
// Password utility
// knows: How to hash and verify passwords.
// AuthService
// knows: what needs to happen when a user registers