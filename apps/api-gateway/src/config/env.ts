import dotenv from 'dotenv';

dotenv.config({
  path: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
});

const requiredEnvVariables = [
  'NODE_ENV',
  'PORT',
  'JWT_ACCESS_SECRET',
  'AUTH_SERVICE_URL',
  'TOURNAMENT_SERVICE_URL',
  'AUCTION_SERVICE_URL',
  'COMPETITION_SERVICE_URL',
  'NOTIFICATION_SERVICE_URL',
] as const;

for (const variable of requiredEnvVariables) {
  if (!process.env[variable]) {
    throw new Error(`Missing required environment variable: ${variable}`);
  }
}

export const env = {
  nodeEnv: process.env.NODE_ENV!,
  port: Number(process.env.PORT),
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET!,
  authServiceUrl: process.env.AUTH_SERVICE_URL!,
  tournamentServiceUrl: process.env.TOURNAMENT_SERVICE_URL!,
  auctionServiceUrl: process.env.AUCTION_SERVICE_URL!,
  competitionServiceUrl: process.env.COMPETITION_SERVICE_URL!,
  notificationServiceUrl: process.env.NOTIFICATION_SERVICE_URL!,
};
