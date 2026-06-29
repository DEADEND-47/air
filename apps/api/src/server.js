import { createApp } from './app.js';
import { config } from './config.js';
import { attachRealtime } from './realtime/hub.js';

const app = await createApp();

const server = app.listen(config.API_PORT, () => {
  console.log(`AirIQ API running at http://localhost:${config.API_PORT}`);
});

attachRealtime(server);
