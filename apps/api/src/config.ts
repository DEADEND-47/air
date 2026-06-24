import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_PORT: z.coerce.number().int().positive().default(4000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  DATABASE_URL: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  JWT_SECRET: z.string().min(16).default('airiq-development-secret-change-me'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  UPLOAD_DIR: z.string().default('./uploads'),
  AI_PROVIDER: z.enum(['local', 'compatible']).default('local'),
  AI_API_URL: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),
  AI_API_KEY: z.preprocess((val) => val === '' ? undefined : val, z.string().optional()),
  AI_MODEL: z.string().default('airiq-intelligence'),
  AI_DAILY_BUDGET_USD: z.coerce.number().nonnegative().default(10),
  DISABLE_JOBS: z.coerce.boolean().default(false),
  SUPABASE_URL: z.preprocess((val) => val === '' ? undefined : val, z.string().url().optional()),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@airiq.city'),
});

export type AppConfig = z.infer<typeof schema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const config = schema.parse(env);
  if (config.NODE_ENV === 'production' && config.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must contain at least 32 characters in production');
  }
  if (config.AI_PROVIDER === 'compatible' && (!config.AI_API_URL || !config.AI_API_KEY)) {
    throw new Error('AI_API_URL and AI_API_KEY are required for compatible AI provider');
  }
  return config;
}
