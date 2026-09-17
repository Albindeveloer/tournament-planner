import { FastifyReply, FastifyRequest } from "fastify";
import { authService, RegisterUserInput } from "./auth.service.js";

type RegisterRequest = {
    Body: RegisterUserInput;
}

export const registerUser = async (request: FastifyRequest<RegisterRequest>, reply: FastifyReply): Promise<void> => {
        const user = await authService.registerUser(request.body);

        await reply.status(201).send({
            data: { user },
        });
}