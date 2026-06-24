#!/usr/bin/env tsx
/**
 * Bulk Historical Data Import Script
 * Usage: npm run pipeline:import
 * Populates the historical_readings table for all 16 Indian cities (2 years of data)
 */
import postgres from 'postgres';
import { loadConfig } from '../config.js';
import { PostgresAirIqRepository } from '../infrastructure/postgres-repository.js';
import { EtlPipeline } from './etl-pipeline.js';

async function main(): Promise<void> {
  console.log('🚀 AirIQ Historical Data Import');
  console.log('================================\n');

  const config = loadConfig();
  if (!config.DATABASE_URL) {
    console.error('❌ DATABASE_URL is not set. Exiting.');
    process.exit(1);
  }

  const sql = postgres(config.DATABASE_URL, { max: 5, idle_timeout: 30 });
  const repository = new PostgresAirIqRepository(sql);
  const pipeline = new EtlPipeline(repository);

  const daysBack = parseInt(process.env['DAYS_BACK'] ?? '730', 10);
  const cityIds = process.env['CITY_IDS']?.split(',').map((s) => s.trim());

  console.log(`📅 Importing ${daysBack} days of historical data`);
  if (cityIds) console.log(`🏙️  Cities: ${cityIds.join(', ')}`);
  else console.log('🏙️  All 16 cities');
  console.log('');

  const startMs = Date.now();
  try {
    const result = await pipeline.run({
    daysBack,
    ...(cityIds !== undefined ? { cityIds } : {}),
  });
    const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);

    console.log('\n✅ Import Complete');
    console.log('==================');
    console.log(`  Run ID:           ${result.runId}`);
    console.log(`  Cities processed: ${result.citiesProcessed}`);
    console.log(`  Rows inserted:    ${result.rowsInserted.toLocaleString()}`);
    console.log(`  Rows skipped:     ${result.rowsSkipped.toLocaleString()}`);
    console.log(`  Duration:         ${elapsed}s`);
    console.log('');
    console.log('💡 Query historical data at: GET /api/v1/historical?cityId=delhi&from=2024-01-01&to=2024-12-31');
  } catch (err) {
    console.error('\n❌ Import failed:', err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main().catch(console.error);
