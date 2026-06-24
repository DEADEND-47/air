#!/usr/bin/env tsx
/**
 * Daily Incremental Update Script
 * Usage: npm run pipeline:update
 * Ingests the last 3 days of data to fill any gaps.
 * Designed to be run daily by a cron or cloud scheduler.
 */
import postgres from 'postgres';
import { loadConfig } from '../config.js';
import { PostgresAirIqRepository } from '../infrastructure/postgres-repository.js';
import { EtlPipeline } from './etl-pipeline.js';

async function main(): Promise<void> {
  console.log(`🔄 AirIQ Daily Update — ${new Date().toISOString()}`);

  const config = loadConfig();
  if (!config.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set.');
    process.exit(1);
  }

  const sql = postgres(config.DATABASE_URL, { max: 3 });
  const repository = new PostgresAirIqRepository(sql);
  const pipeline = new EtlPipeline(repository);

  try {
    const result = await pipeline.runDailyUpdate();
    console.log(`✅ Daily update complete: ${result.rowsInserted} rows inserted`);
  } catch (err) {
    console.error('❌ Daily update failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
