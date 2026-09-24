import { FastifyReply, FastifyRequest } from 'fastify';
import { authService, RegisterUserInput, LoginInput } from './auth.service.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middleware/app-error.js';

// Extend @fastify/jwt types so request.user is typed after jwtVerify().
declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; exp?: number; iat?: number };
    user: { sub: string };
  }
}

type RegisterRequest = {
  Body: RegisterUserInput;
};

type LoginRequest = {
  Body: LoginInput;
};

type RefreshRequest = {
  Body: { refresh_token: string };
};

type LogoutRequest = {
  Body: { refresh_token: string };
};

type ForgotPasswordRequest = {
  Body: { email: string };
};

type ResetPasswordRequest = {
  Body: { token: string; new_password: string };
};

export const registerUser = async (
  request: FastifyRequest<RegisterRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const user = await authService.registerUser(request.body);

  await reply.status(201).send({
    data: { user },
  });
};

export const loginUser = async (
  request: FastifyRequest<LoginRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const { user, refreshToken } = await authService.loginUser(request.body);

  const accessToken = request.server.jwt.sign(
    { sub: user.id },
    { expiresIn: env.jwtAccessExpiresIn },
  );

  await reply.status(200).send({
    data: {
      user,
      access_token: accessToken,
      refresh_token: refreshToken,
      token_type: 'Bearer',
    },
  });
};

export const refreshToken = async (
  request: FastifyRequest<RefreshRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const { user, refreshToken: newRefreshToken } = await authService.refreshToken(
    request.body.refresh_token,
  );

  const accessToken = request.server.jwt.sign(
    { sub: user.id },
    { expiresIn: env.jwtAccessExpiresIn },
  );

  await reply.status(200).send({
    data: {
      user,
      access_token: accessToken,
      refresh_token: newRefreshToken,
      token_type: 'Bearer',
    },
  });
};

export const logout = async (
  request: FastifyRequest<LogoutRequest>,
  reply: FastifyReply,
): Promise<void> => {
  await authService.logoutUser(request.body.refresh_token);
  await reply.status(204).send();
};

export const forgotPassword = async (
  request: FastifyRequest<ForgotPasswordRequest>,
  reply: FastifyReply,
): Promise<void> => {
  const plaintext = await authService.forgotPassword(request.body.email);

  // In production, the token would be emailed — never returned in the response.
  // In development, expose it so the flow can be tested without an email service.
  if (env.nodeEnv === 'development' && plaintext !== null) {
    await reply.status(202).send({ data: { reset_token: plaintext } });
    return;
  }

  await reply.status(202).send();
};

export const resetPassword = async (
  request: FastifyRequest<ResetPasswordRequest>,
  reply: FastifyReply,
): Promise<void> => {
  await authService.resetPassword(request.body.token, request.body.new_password);
  await reply.status(200).send({ data: { message: 'Password has been reset successfully' } });
};

export const getMeHandler = async (
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> => {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppError('UNAUTHORIZED', 401, 'Authentication required');
  }

  const user = await authService.getMe(request.user.sub);
  await reply.status(200).send({ data: { user } });
};
