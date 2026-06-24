import { describe, expect, it, vi } from 'vitest';
import { ForecastAgent, AttributionAgent, AlertCorrelationAgent, HealthAdvisoryAgent, EnforcementPrioritizationAgent } from './agents.js';
import { CompatibleAiProvider, LocalAiProvider, type AiProvider, type ModelResponse } from './provider.js';
import type { City, SensorReading, Alert, ForecastPoint } from '../domain/models.js';

describe('AI Agent Fallbacks & Provider Interfacing', () => {
  const dummyCity: City = { id: 'delhi', name: 'Delhi', state: 'NCT', latitude: 28.6, longitude: 77.2, aqi: 320, pm25: 320, pm10: 380, no2: 80, trend: 'up', updatedAt: new Date().toISOString() };
  const dummyReadings: SensorReading[] = [
    { id: '1', sensorId: 'DL-01', cityId: 'delhi', ward: 'Anand Vihar', latitude: 28.6, longitude: 77.2, aqi: 340, pm25: 300, pm10: 380, no2: 90, temperature: 30, humidity: 60, observedAt: new Date().toISOString() }
  ];

  it('should fall back to deterministic predictions in ForecastAgent when AI provider budget is depleted', async () => {
    const mockProvider: AiProvider = { generate: vi.fn() };
    const agent = new ForecastAgent(mockProvider);

    const context = { traceId: 'test-trace', budgetRemainingUsd: 0, attempt: 1 };
    const result = await agent.run({ city: dummyCity, readings: dummyReadings }, context);

    expect(result.fallbackUsed).toBe(true);
    expect(result.provider).toBe('local-deterministic');
    expect(result.data.length).toBeGreaterThan(0);
    const firstPoint = result.data[0];
    expect(firstPoint).toBeDefined();
    if (firstPoint) {
      expect(firstPoint.predictedAqi).toBeDefined();
      expect(firstPoint.upperBound).toBeGreaterThanOrEqual(firstPoint.lowerBound);
    }
  });

  it('should request structured output from AI provider in ForecastAgent when budget is available', async () => {
    const mockResponse: ModelResponse<ForecastPoint[]> = {
      data: [{ cityId: 'delhi', ward: 'Citywide', horizonHours: 6, predictedAqi: 280, lowerBound: 260, upperBound: 300, confidence: 0.85, predictedAt: new Date().toISOString(), drivers: ['wind speed'] }],
      provider: 'compatible',
      costUsd: 0.05,
    };
    const mockProvider: AiProvider = {
      generate: vi.fn().mockResolvedValue(mockResponse),
    };
    const agent = new ForecastAgent(mockProvider);

    const context = { traceId: 'test-trace', budgetRemainingUsd: 1.0, attempt: 1 };
    const result = await agent.run({ city: dummyCity, readings: dummyReadings, horizons: [6] }, context);

    expect(result.fallbackUsed).toBe(false);
    expect(result.provider).toBe('compatible');
    expect(result.costUsd).toBe(0.05);
    expect(result.data).toEqual(mockResponse.data);
  });

  it('should use deterministic fallback in AttributionAgent when provider fails', async () => {
    const mockProvider: AiProvider = {
      generate: vi.fn().mockRejectedValue(new Error('API failure')),
    };
    const agent = new AttributionAgent(mockProvider);

    const context = { traceId: 'test-trace', budgetRemainingUsd: 1.0, attempt: 1 };
    const result = await agent.run({ cityId: 'delhi', ward: 'Citywide', readings: dummyReadings }, context);

    expect(result.fallbackUsed).toBe(true);
    expect(result.provider).toBe('local-deterministic');
    expect(result.data.sources.length).toBeGreaterThan(0);
    expect(result.data.explanation).toBeDefined();
  });

  it('should correctly format outputs in AlertCorrelationAgent fallback', async () => {
    const mockProvider: AiProvider = { generate: vi.fn() };
    const agent = new AlertCorrelationAgent(mockProvider);

    const alerts: Alert[] = [
      { id: 'alert-1', cityId: 'delhi', ward: 'Okhla', title: 'Plume spike', description: 'SO2 alert', severity: 'critical', status: 'open', source: 'sensor', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
      { id: 'alert-2', cityId: 'delhi', ward: 'Okhla', title: 'PM spike', description: 'PM2.5 alert', severity: 'warning', status: 'open', source: 'sensor', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    ];

    const context = { traceId: 'test-trace', budgetRemainingUsd: 0, attempt: 1 };
    const result = await agent.run({ alerts }, context);

    expect(result.fallbackUsed).toBe(true);
    expect(result.data.clusters.length).toBe(1);
    const firstCluster = result.data.clusters[0];
    expect(firstCluster).toBeDefined();
    if (firstCluster) {
      expect(firstCluster.alertIds).toContain('alert-1');
      expect(firstCluster.alertIds).toContain('alert-2');
      expect(firstCluster.severity).toBe('critical');
    }
  });

  it('should provide appropriate advisory messages in HealthAdvisoryAgent fallback', async () => {
    const mockProvider: AiProvider = { generate: vi.fn() };
    const agent = new HealthAdvisoryAgent(mockProvider);

    const context = { traceId: 'test-trace', budgetRemainingUsd: 0, attempt: 1 };
    const result = await agent.run({ cityId: 'delhi', ward: 'Dwarka', aqi: 410, audience: ['children'], channels: ['push'] }, context);

    expect(result.fallbackUsed).toBe(true);
    expect(result.data.severity).toBe('critical');
    expect(result.data.message).toContain('indoors');
  });

  it('should prioritize targets dynamically in EnforcementPrioritizationAgent fallback', async () => {
    const mockProvider: AiProvider = { generate: vi.fn() };
    const agent = new EnforcementPrioritizationAgent(mockProvider);

    const attributionInput = {
      cityId: 'delhi',
      ward: 'Citywide',
      generatedAt: new Date().toISOString(),
      confidence: 0.9,
      sources: [
        { source: 'Vehicular traffic', contribution: 60, direction: 'rising' as const },
        { source: 'Industry', contribution: 20, direction: 'stable' as const }
      ],
      explanation: 'Traffic dominance.',
    };

    const context = { traceId: 'test-trace', budgetRemainingUsd: 0, attempt: 1 };
    const result = await agent.run({ cityId: 'delhi', attribution: attributionInput, alerts: [] }, context);

    expect(result.fallbackUsed).toBe(true);
    expect(result.data.length).toBe(2);
    const item0 = result.data[0];
    const item1 = result.data[1];
    expect(item0).toBeDefined();
    expect(item1).toBeDefined();
    if (item0 && item1) {
      expect(item0.category).toBe('Vehicular traffic');
      expect(item0.priority).toBeGreaterThan(item1.priority);
    }
  });

  it('should throw an error in LocalAiProvider generate', async () => {
    const provider = new LocalAiProvider();
    await expect(provider.generate()).rejects.toThrowError(
      'Local provider delegates to deterministic agent fallback'
    );
  });

  it('should generate structured output in CompatibleAiProvider using fetch', async () => {
    const config = {
      AI_PROVIDER: 'compatible' as const,
      AI_API_URL: 'http://mock-ai.url',
      AI_API_KEY: 'mock-key',
      AI_MODEL: 'mock-model',
      NODE_ENV: 'development' as const,
      API_PORT: 4000,
      WEB_ORIGIN: 'http://localhost',
      JWT_SECRET: 'secret',
      LOG_LEVEL: 'info' as const,
      UPLOAD_DIR: 'uploads',
      AI_DAILY_BUDGET_USD: 10,
      DISABLE_JOBS: false,
    };
    const provider = new CompatibleAiProvider(config);

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        output: { predictedAqi: 350 },
        usage: { estimated_cost_usd: 0.02 }
      })
    });
    globalThis.fetch = mockFetch;

    const result = await provider.generate<{ predictedAqi: number }>('test-task', { input: 123 });
    expect(result.data.predictedAqi).toBe(350);
    expect(result.provider).toBe('compatible');
    expect(result.costUsd).toBe(0.02);

    expect(mockFetch).toHaveBeenCalledWith(
      'http://mock-ai.url',
      expect.objectContaining({
        method: 'POST',
        headers: { Authorization: 'Bearer mock-key', 'Content-Type': 'application/json' },
      })
    );
  });
});

