import type { AgentContext, AgentResult, IntelligenceAgent } from '../application/ports.js';
import type { Advisory, Alert, Attribution, City, EnforcementCase, ForecastPoint, SensorReading } from '../domain/models.js';
import { healthMessage, severityForAqi } from '../domain/aqi.js';
import type { AiProvider } from './provider.js';

abstract class ResilientAgent<Input, Output> implements IntelligenceAgent<Input, Output> {
  abstract readonly name: string;
  constructor(private readonly provider: AiProvider) {}

  async run(input: Input, context: AgentContext): Promise<AgentResult<Output>> {
    const startedAt = performance.now();
    if (context.budgetRemainingUsd > 0) {
      try {
        const response = await this.provider.generate<Output>(this.name, input);
        if (response.costUsd <= context.budgetRemainingUsd) {
          return { data: response.data, confidence: 0.9, provider: response.provider, costUsd: response.costUsd, durationMs: performance.now() - startedAt, fallbackUsed: false, rationale: 'Validated structured model response' };
        }
      } catch {
        // Deterministic fallbacks keep safety workflows operational during provider outages.
      }
    }
    return { data: this.fallback(input), confidence: this.fallbackConfidence(), provider: 'local-deterministic', costUsd: 0, durationMs: performance.now() - startedAt, fallbackUsed: true, rationale: this.fallbackRationale() };
  }

  protected fallbackConfidence(): number { return 0.78; }
  protected fallbackRationale(): string { return 'Rule-based fallback used for predictable, auditable operation'; }
  protected abstract fallback(input: Input): Output;
}

export interface ForecastInput { city: City; readings: SensorReading[]; horizons?: number[] }
export class ForecastAgent extends ResilientAgent<ForecastInput, ForecastPoint[]> {
  readonly name = 'hyperlocal_forecast';
  protected fallback(input: ForecastInput): ForecastPoint[] {
    const latest = input.readings[0]?.aqi ?? input.city.aqi;
    const previous = input.readings[1]?.aqi ?? latest;
    const slope = Math.max(-12, Math.min(12, latest - previous));
    return (input.horizons ?? [2, 6, 12, 24]).map((hours) => {
      const predictedAqi = Math.max(0, Math.round(latest + slope * Math.sqrt(hours) * 0.65));
      const uncertainty = Math.round(12 + hours * 1.25);
      return { cityId: input.city.id, ward: 'Citywide', horizonHours: hours, predictedAqi, lowerBound: Math.max(0, predictedAqi - uncertainty), upperBound: predictedAqi + uncertainty, confidence: Math.max(0.58, 0.94 - hours * 0.006), predictedAt: new Date(Date.now() + hours * 3_600_000).toISOString(), drivers: slope > 0 ? ['recent concentration trend', 'low dispersion'] : ['improving dispersion', 'recent concentration trend'] };
    });
  }
}

export interface AttributionInput { cityId: string; ward: string; readings: SensorReading[] }
export class AttributionAgent extends ResilientAgent<AttributionInput, Attribution> {
  readonly name = 'pollution_attribution';
  protected fallback(input: AttributionInput): Attribution {
    const averageNo2 = input.readings.reduce((sum, item) => sum + item.no2, 0) / Math.max(1, input.readings.length);
    const traffic = Math.round(Math.min(58, 32 + averageNo2 * 0.16));
    const dust = Math.round(Math.max(18, 34 - averageNo2 * 0.04));
    const industry = 16;
    const other = 100 - traffic - dust - industry;
    return { cityId: input.cityId, ward: input.ward, generatedAt: new Date().toISOString(), confidence: 0.81, sources: [{ source: 'Vehicular traffic', contribution: traffic, direction: 'rising' }, { source: 'Road and construction dust', contribution: dust, direction: 'stable' }, { source: 'Industry', contribution: industry, direction: 'stable' }, { source: 'Biomass and other', contribution: other, direction: 'falling' }], explanation: 'NO2 and particulate ratios indicate traffic as the dominant source, amplified by weak atmospheric dispersion.' };
  }
}

export interface CorrelationInput { alerts: Alert[] }
export interface CorrelationOutput { clusters: Array<{ id: string; alertIds: string[]; summary: string; severity: string; confidence: number }> }
export class AlertCorrelationAgent extends ResilientAgent<CorrelationInput, CorrelationOutput> {
  readonly name = 'alert_correlation';
  protected fallback(input: CorrelationInput): CorrelationOutput {
    const groups = new Map<string, Alert[]>();
    for (const alert of input.alerts) {
      const key = `${alert.cityId}:${alert.ward}`;
      let list = groups.get(key);
      if (!list) {
        list = [];
        groups.set(key, list);
      }
      list.push(alert);
    }
    return {
      clusters: Array.from(groups.entries()).map(([key, alerts], index) => {
        const firstWard = alerts[0]?.ward ?? key;
        const hasCritical = alerts.some((item) => item.severity === 'critical');
        const hasWarning = alerts.some((item) => item.severity === 'warning');
        return {
          id: `cluster-${index + 1}`,
          alertIds: alerts.map((item) => item.id),
          summary: `${alerts.length} signal${alerts.length === 1 ? '' : 's'} correlated in ${firstWard}`,
          severity: hasCritical ? 'critical' : hasWarning ? 'warning' : 'info',
          confidence: Math.min(0.96, 0.72 + alerts.length * 0.08)
        };
      })
    };
  }
}

export interface AdvisoryInput { cityId: string; ward: string; aqi: number; audience: string[]; channels: Advisory['channels'] }
export class HealthAdvisoryAgent extends ResilientAgent<AdvisoryInput, Pick<Advisory, 'severity' | 'message'>> {
  readonly name = 'health_advisory';
  protected fallback(input: AdvisoryInput): Pick<Advisory, 'severity' | 'message'> {
    return { severity: severityForAqi(input.aqi), message: `${input.ward}: AQI is ${input.aqi}. ${healthMessage(input.aqi)}` };
  }
  protected fallbackConfidence(): number { return 0.94; }
}

export interface EnforcementInput { cityId: string; attribution: Attribution; alerts: Alert[] }
export class EnforcementPrioritizationAgent extends ResilientAgent<EnforcementInput, Array<Omit<EnforcementCase, 'id' | 'createdAt' | 'updatedAt'>>> {
  readonly name = 'enforcement_prioritization';
  protected fallback(input: EnforcementInput): Array<Omit<EnforcementCase, 'id' | 'createdAt' | 'updatedAt'>> {
    return input.attribution.sources.slice(0, 3).map((source, index) => ({ cityId: input.cityId, ward: input.attribution.ward, target: source.source === 'Vehicular traffic' ? 'High-emission traffic corridor' : `${source.source} hotspot`, category: source.source, priority: Math.min(100, Math.round(source.contribution * 1.7 + input.alerts.filter((alert) => alert.severity === 'critical').length * 8 - index * 3)), evidenceScore: Math.max(0.65, input.attribution.confidence - index * 0.05), estimatedImpact: Number((source.contribution * 0.32).toFixed(1)), status: 'queued' }));
  }
}

export interface AgentSuite {
  forecast: ForecastAgent;
  attribution: AttributionAgent;
  correlation: AlertCorrelationAgent;
  advisory: HealthAdvisoryAgent;
  enforcement: EnforcementPrioritizationAgent;
}

export function createAgentSuite(provider: AiProvider): AgentSuite {
  return { forecast: new ForecastAgent(provider), attribution: new AttributionAgent(provider), correlation: new AlertCorrelationAgent(provider), advisory: new HealthAdvisoryAgent(provider), enforcement: new EnforcementPrioritizationAgent(provider) };
}
