import crypto from 'crypto';

export const generateRefreshToken = (): { plaintext: string; hash: string } => {
  const plaintext = crypto.randomBytes(48).toString('base64url');
  return { plaintext, hash: hashToken(plaintext) };
};

export const hashToken = (token: string): string => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

// Parses duration strings like "7d", "15m", "1h", "30s" into milliseconds.
export const parseDurationToMs = (duration: string): number => {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration format: "${duration}"`);
  const value = parseInt(match[1]!, 10);
  const unit = match[2] as 's' | 'm' | 'h' | 'd';
  const multipliers: Record<typeof unit, number> = {
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
};
