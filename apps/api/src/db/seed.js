import { eq } from 'drizzle-orm';
import { fileURLToPath } from 'node:url';
import { db } from './index.js';
import { migrate } from './migrate.js';
import * as schema from './schema.js';
import { createSeedData } from './seed-data.js';
import { runEtl } from '../pipeline/etl-pipeline.js';

const now = () => new Date().toISOString();
const json = (value) => JSON.stringify(value);

export async function seed() {
  migrate();
  const data = await createSeedData();

  for (const user of data.users) {
    await db.insert(schema.users).values({ ...user, createdAt: now(), updatedAt: now() }).onConflictDoNothing();
  }
  for (const city of data.cities) {
    await db.insert(schema.cities).values(city).onConflictDoUpdate({ target: schema.cities.id, set: city });
  }
  for (const reading of data.readings) {
    await db.insert(schema.readings).values(reading).onConflictDoNothing();
  }
  await db.delete(schema.forecasts);
  for (const forecast of data.forecasts) {
    await db.insert(schema.forecasts).values({ ...forecast, driversJson: json(forecast.drivers) });
  }
  await db.delete(schema.attributions);
  for (const attribution of data.attributions) {
    await db.insert(schema.attributions).values({ ...attribution, sourcesJson: json(attribution.sources) });
  }
  for (const alert of data.alerts) {
    await db.insert(schema.alerts).values(alert).onConflictDoNothing();
  }
  for (const advisory of data.advisories) {
    await db.insert(schema.advisories).values({
      ...advisory,
      audienceJson: json(advisory.audience),
      channelsJson: json(advisory.channels),
    }).onConflictDoNothing();
  }
  for (const item of data.enforcementCases) {
    await db.insert(schema.enforcementCases).values(item).onConflictDoNothing();
  }
  await db.insert(schema.settings).values({
    key: 'notifications',
    valueJson: json({ emailsEnabled: true, aqiThreshold: 300 }),
    updatedAt: now(),
  }).onConflictDoUpdate({
    target: schema.settings.key,
    set: { valueJson: json({ emailsEnabled: true, aqiThreshold: 300 }), updatedAt: now() },
  });

  const historical = await db.select().from(schema.historicalReadings).limit(1);
  if (historical.length === 0) {
    await runEtl({ source: 'synthetic', daysBack: 30 });
  }

  const city = await db.select().from(schema.cities).where(eq(schema.cities.id, 'delhi')).get();
  return city;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seed();
  console.log('Seed data loaded. Demo login: admin@airiq.local / Password123!');
}
