import { hashPassword, verifyPassword } from './password.js';
import { userRepository, User } from '../users/user.repository.js';
import { refreshTokenRepository } from '../refresh-tokens/refresh-token.repository.js';
import { passwordResetTokenRepository } from '../password-reset-tokens/password-reset-token.repository.js';
import { generateRefreshToken, hashToken, parseDurationToMs } from './token.utils.js';
import { AppError } from '../../middleware/app-error.js';
import { env } from '../../config/env.js';

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

export type AuthResult = {
  user: SafeUser;
  refreshToken: string;
};

export class AuthService {
  async loginUser(input: LoginInput): Promise<AuthResult> {
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

    const { plaintext, hash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn));

    await refreshTokenRepository.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt,
    });

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, refreshToken: plaintext };
  }

  async refreshToken(incomingToken: string): Promise<AuthResult> {
    const hash = hashToken(incomingToken);
    const record = await refreshTokenRepository.findByHash(hash);

    if (!record) {
      throw new AppError('INVALID_REFRESH_TOKEN', 401, 'Invalid or expired refresh token');
    }

    // Reuse detection: a revoked token was presented — possible token theft.
    // Invalidate the entire session for this user as a precaution.
    if (record.revoked_at !== null) {
      await refreshTokenRepository.revokeAllForUser(record.user_id);
      throw new AppError('INVALID_REFRESH_TOKEN', 401, 'Invalid or expired refresh token');
    }

    if (new Date() > record.expires_at) {
      throw new AppError('INVALID_REFRESH_TOKEN', 401, 'Invalid or expired refresh token');
    }

    const user = await userRepository.findById(record.user_id);
    if (!user || user.status !== 'ACTIVE') {
      throw new AppError('ACCOUNT_INACTIVE', 403, 'Your account is not active');
    }

    const { plaintext, hash: newHash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.jwtRefreshExpiresIn));

    await refreshTokenRepository.rotateToken(record.id, {
      userId: user.id,
      tokenHash: newHash,
      expiresAt,
    });

    const { password_hash: _, ...safeUser } = user;
    return { user: safeUser, refreshToken: plaintext };
  }

  async logoutUser(incomingToken: string): Promise<void> {
    const hash = hashToken(incomingToken);
    const record = await refreshTokenRepository.findByHash(hash);

    // Idempotent: already revoked or token not found — treat as a successful logout.
    if (!record || record.revoked_at !== null) {
      return;
    }

    await refreshTokenRepository.revokeById(record.id);
  }

  // Returns the plaintext token so it can be delivered (e.g. via email) by the caller.
  // Always resolves — never reveals whether the email exists.
  async forgotPassword(email: string): Promise<string | null> {
    const normalized = email.trim().toLowerCase();
    const user = await userRepository.findByEmail(normalized);

    if (!user) {
      return null;
    }

    const { plaintext, hash } = generateRefreshToken();
    const expiresAt = new Date(Date.now() + parseDurationToMs(env.passwordResetExpiresIn));

    await passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: hash,
      expiresAt,
    });

    return plaintext;
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    const hash = hashToken(token);
    const record = await passwordResetTokenRepository.findByHash(hash);

    if (!record) {
      throw new AppError('INVALID_RESET_TOKEN', 400, 'Invalid or expired password reset token');
    }

    if (record.used_at !== null) {
      throw new AppError('INVALID_RESET_TOKEN', 400, 'Invalid or expired password reset token');
    }

    if (new Date() > record.expires_at) {
      throw new AppError('INVALID_RESET_TOKEN', 400, 'Invalid or expired password reset token');
    }

    const passwordHash = await hashPassword(newPassword);

    await userRepository.updatePassword(record.user_id, passwordHash);
    await passwordResetTokenRepository.markAsUsed(record.id);
    await refreshTokenRepository.revokeAllForUser(record.user_id);
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
