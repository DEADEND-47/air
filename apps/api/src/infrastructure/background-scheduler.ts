import type { FastifyBaseLogger } from 'fastify';
import type { AirIqService } from '../application/airiq-service.js';

export class BackgroundScheduler {
  private timers: NodeJS.Timeout[] = [];
  constructor(private readonly service: AirIqService, private readonly logger: FastifyBaseLogger) {}

  start(): void {
    // Run alert correlation for all cities every 5 minutes
    this.timers.push(setInterval(() => void this.runAllCities('alert-correlation', (cityId) => this.service.correlateAlerts(cityId)), 5 * 60_000));
    
    // Run forecast refresh for all cities every 15 minutes
    this.timers.push(setInterval(() => void this.runAllCities('forecast-refresh', (cityId) => this.service.runForecast(cityId)), 15 * 60_000));
    
    for (const timer of this.timers) timer.unref();
  }

  stop(): void { 
    for (const timer of this.timers) clearInterval(timer); 
    this.timers = []; 
  }

  private async runAllCities(name: string, operation: (cityId: string) => Promise<unknown>): Promise<void> {
    try {
      const cities = await this.service.listCities();
      for (const city of cities) {
        await this.run(`${name}-${city.id}`, () => operation(city.id));
      }
    } catch (error) {
      this.logger.error({ job: name, error }, 'failed to get cities for background job');
    }
  }

  private async run(name: string, operation: () => Promise<unknown>): Promise<void> {
    try { 
      await operation(); 
      this.logger.info({ job: name }, 'background job completed'); 
    } catch (error) { 
      this.logger.error({ job: name, error }, 'background job failed'); 
    }
  }
}
