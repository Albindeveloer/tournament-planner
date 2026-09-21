import { FastifyReply, FastifyRequest } from "fastify";
import { authService, RegisterUserInput, LoginInput } from "./auth.service.js";
import { env } from "../../config/env.js";

type RegisterRequest = {
    Body: RegisterUserInput;
}

type LoginRequest = {
    Body: LoginInput;
}

export const registerUser = async (request: FastifyRequest<RegisterRequest>, reply: FastifyReply): Promise<void> => {
    const user = await authService.registerUser(request.body);

    await reply.status(201).send({
        data: { user },
    });
}

export const loginUser = async (request: FastifyRequest<LoginRequest>, reply: FastifyReply): Promise<void> => {
    const user = await authService.loginUser(request.body);

    const accessToken = request.server.jwt.sign(
        { sub: user.id },
        { expiresIn: env.jwtAccessExpiresIn },
    );

    await reply.status(200).send({
        data: {
            user,
            access_token: accessToken,
            token_type: 'Bearer',
        },
    });
}