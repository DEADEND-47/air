import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_FILE: z.string().default('./data/airiq.db'),
  JWT_SECRET: z.string().min(16).default('airiq-local-dev-secret-change-me'),
  ACCESS_TOKEN_MINUTES: z.coerce.number().int().positive().default(60),
  REFRESH_TOKEN_DAYS: z.coerce.number().int().positive().default(7),
  UPLOAD_DIR: z.string().default('./uploads'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@airiq.local'),
  ENABLE_CRON: z.coerce.boolean().default(false),
  OPENAQ_API_KEY: z.string().optional(),
});

export function loadConfig(env = process.env) {
  const config = schema.parse(env);
  if (config.NODE_ENV === 'production' && config.JWT_SECRET === 'airiq-local-dev-secret-change-me') {
    throw new Error('Set JWT_SECRET before running in production');
  }
  return config;
}

export const config = loadConfig();
