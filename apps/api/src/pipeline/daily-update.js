import { migrate } from '../db/migrate.js';
import { runEtl } from './etl-pipeline.js';

migrate();
const result = await runEtl({ source: 'real', daysBack: 3 });
console.log('Daily ETL update complete:', result);
