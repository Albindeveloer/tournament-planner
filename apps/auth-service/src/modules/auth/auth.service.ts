import { hashPassword } from "./password.js";
import { userRepository, User } from "../users/user.repository.js";

export type RegisterUserInput = {
    email: string;
    password: string;
    first_name: string;
    last_name?: string;
};
export type SafeUser = Omit<User, 'password_hash'>;

export class AuthService {
    async registerUser(input: RegisterUserInput): Promise<SafeUser> {
        const email = input.email.trim().toLowerCase();
        const existingUser = await userRepository.findByEmail(email);
        if (existingUser) {
            throw new Error('EMAIL_ALREADY_EXISTS');
        }
        const passwordHash = await hashPassword(input.password);

        const user = await userRepository.createUser({
            email: input.email,
            passwordHash,
            firstName: input.first_name.trim(),
            lastName: input.last_name?.trim() || null,
        });

        const { password_hash: _passwordHash, ...safeUser } = user;
        return safeUser;
    }
}

export const authService = new AuthService();

// Repository
// knows: How to intract with the PostgreSQL.
// Password utility
// knows: How to hash and verify passwords.
// AuthService
// knows: what needs to happen when a user registers