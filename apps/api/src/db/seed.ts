import postgres from 'postgres';
import { loadConfig } from '../config.js';
import { PostgresAirIqRepository } from '../infrastructure/postgres-repository.js';
import { createSeedData } from '../infrastructure/seed-data.js';

const config = loadConfig();
if (!config.DATABASE_URL) throw new Error('DATABASE_URL is required to seed the database');

const sql = postgres(config.DATABASE_URL, { max: 2 });
const repository = new PostgresAirIqRepository(sql);
try {
  await repository.seed(await createSeedData());
  console.info('AirIQ seed data loaded');
} finally {
  await sql.end();
}
