import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { loadConfig } from '../config.js';

const config = loadConfig();
if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required to run migrations');

const sql = postgres(config.DATABASE_URL, { max: 1 });
try {
  const migrationsDir = resolve(process.cwd(), 'migrations');
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();
  
  for (const file of sqlFiles) {
    console.info(`Running migration: ${file}`);
    const content = await readFile(resolve(migrationsDir, file), 'utf8');
    await sql.unsafe(content);
  }
  console.info('AirIQ database migrations completed successfully');
} finally {
  await sql.end();
}
