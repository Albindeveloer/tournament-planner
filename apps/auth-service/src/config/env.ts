import dotenv from 'dotenv';

// Load environment variables from .env file based on the current NODE_ENV {for test and development environments}. In production, environment variables should be set directly in the environment.
dotenv.config({ 
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env'
})
const requiredEnvVariables = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_SECRET',
  'JWT_REFRESH_EXPIRES_IN',
  'PASSWORD_RESET_EXPIRES_IN',
  'RABBITMQ_URL',
] as const;

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV!,
  port: Number(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL!,
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN!,
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET!,
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN!,
  passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN!,
  rabbitmqUrl: process.env.RABBITMQ_URL!,
};

//validate the environment variables at startup. we don't want to start the application if any required environment variable is missing.
