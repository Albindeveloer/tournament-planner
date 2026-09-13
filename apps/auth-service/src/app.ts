import Fastify from "fastify";

export const buildApp = () => {
  const app = Fastify({
    logger: true,
  });

  app.get("/health", async (request, reply) => {
    return { 
        data: {
            service: 'auth-service',
            status: "ok",
        },
    };
  });

  return app;
};