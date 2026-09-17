import { FastifyInstance } from "fastify";
import { registerUser } from "./auth.controller.js";

export const authRoutes = async (app: FastifyInstance): Promise<void> => {
    app.post('/register',
        {
            schema: {
                body: {
                    type: 'object',
                    required: ['email', 'password', 'first_name'],
                    additionalProperties: false, // Prevents client extra properties from being sent in the request body
                    properties: {
                        email: { type: 'string', format: 'email', maxLength: 255 },
                        password: { type: 'string', minLength: 8, maxLength: 128 },
                        first_name: { type: 'string', minLength: 1, maxLength: 255 },
                        last_name: { type: 'string', maxLength: 255 },
                    },
                },
            },
        },
        registerUser
    );
}