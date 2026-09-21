import { FastifyReply, FastifyRequest } from 'fastify';
import { authService, RegisterUserInput, LoginInput } from './auth.service.js';
import { env } from '../../config/env.js';

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
