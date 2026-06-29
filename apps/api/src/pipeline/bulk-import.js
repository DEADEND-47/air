import { migrate } from '../db/migrate.js';
import { seed } from '../db/seed.js';
import { runEtl } from './etl-pipeline.js';

migrate();
await seed();
const result = await runEtl({ source: 'synthetic', daysBack: Number(process.env.DAYS_BACK ?? 365) });
console.log('Historical import complete:', result);
