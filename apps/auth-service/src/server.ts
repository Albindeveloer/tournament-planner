import { buildApp } from "./app.js";
import { env } from "./config/env.js";

const start = async (): Promise<void> => {
    const app = buildApp();
    try {
        await app.listen({ port: env.port, host: "0.0.0.0" });
        app.log.info(`Server listening on port ${env.port}`);
    } catch (err) {
        app.log.error(err);
        process.exit(1);
    }
};

void start();