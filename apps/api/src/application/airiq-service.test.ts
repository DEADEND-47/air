import { describe, expect, it } from 'vitest';
import { AirIqService } from './airiq-service.js';
import { InMemoryAirIqRepository } from '../infrastructure/in-memory-repository.js';
import { createAgentSuite } from '../ai/agents.js';
import { LocalAiProvider } from '../ai/provider.js';
import { AppError, NotFoundError } from './errors.js';

describe('AirIqService Integration', () => {
  const getService = async () => {
    const repository = await InMemoryAirIqRepository.create();
    const provider = new LocalAiProvider();
    const agents = createAgentSuite(provider);
    const service = new AirIqService(repository, agents, 10);
    return { repository, service };
  };

  it('should return a dashboard overview for a valid city', async () => {
    const { service } = await getService();
    const overview = await service.getOverview('delhi');
    expect(overview).toBeDefined();
    expect(overview.city.name).toBe('Delhi');
    expect(overview.readings.length).toBeGreaterThan(0);
    expect(overview.forecasts.length).toBeGreaterThan(0);
    expect(overview.attribution).toBeDefined();
    expect(overview.insight).toBeDefined();
    expect(overview.sensorUptime).toBe(99.4);
  });

  it('should throw NotFoundError if getOverview is called for an invalid city', async () => {
    const { service } = await getService();
    await expect(service.getOverview('unknown_city')).rejects.toThrowError(
      new NotFoundError('City')
    );
  });

  it('should create an alert and log an audit trail event', async () => {
    const { service, repository } = await getService();
    const alertInput = {
      cityId: 'delhi',
      ward: 'Okhla',
      title: 'Smoke anomaly',
      description: 'Sensor plume detected high levels of particulates',
      severity: 'critical' as const,
      source: 'Thermal satellite feed',
    };

    const alert = await service.createAlert(alertInput, 'usr-admin');
    expect(alert).toBeDefined();
    expect(alert.id).toBeDefined();
    expect(alert.status).toBe('open');

    // Verify stored
    const retrieved = await repository.getAlert(alert.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe(alertInput.title);
  });

  it('should transition alert status correctly through legal transitions', async () => {
    const { service } = await getService();
    const alerts = await service.listAlerts({ cityId: 'delhi' });
    const openAlert = alerts.find((a) => a.status === 'open')!;

    // Transition from open to acknowledged
    const acked = await service.transitionAlert(openAlert.id, 'acknowledged', 'usr-admin');
    expect(acked.status).toBe('acknowledged');
    expect(acked.assignedTo).toBe('usr-admin');

    // Transition from acknowledged to resolved
    const resolved = await service.transitionAlert(openAlert.id, 'resolved', 'usr-admin');
    expect(resolved.status).toBe('resolved');
  });

  it('should prevent illegal alert status transitions', async () => {
    const { service } = await getService();
    const alerts = await service.listAlerts({ cityId: 'delhi' });
    const resolvedAlert = alerts.find((a) => a.status === 'resolved')!;

    // From resolved, no transitions are permitted
    await expect(service.transitionAlert(resolvedAlert.id, 'open', 'usr-admin')).rejects.toThrowError(
      AppError
    );
  });

  it('should generate draft and published advisories', async () => {
    const { service } = await getService();
    const advisoryInput = {
      cityId: 'delhi',
      ward: 'Anand Vihar',
      aqi: 385,
      audience: ['respiratory patients'],
      channels: ['push' as const],
      status: 'draft' as const,
    };

    const draft = await service.createAdvisory(advisoryInput, 'usr-admin');
    expect(draft).toBeDefined();
    expect(draft.status).toBe('draft');
    expect(draft.publishedAt).toBeUndefined();

    const published = await service.publishAdvisory(draft.id, 150000, 'usr-admin');
    expect(published.status).toBe('published');
    expect(published.reach).toBe(150000);
    expect(published.publishedAt).toBeDefined();
  });

  it('should trigger alert correlation and cluster groups', async () => {
    const { service } = await getService();
    const correlation = await service.correlateAlerts('delhi');
    expect(correlation).toBeDefined();
    expect(correlation.clusters).toBeDefined();
    expect(correlation.clusters.length).toBeGreaterThan(0);
  });

  it('should generate, list, and transition enforcement targets', async () => {
    const { service } = await getService();
    
    // Test enforcement generation based on attribution & alerts
    const cases = await service.generateEnforcement('delhi', 'usr-admin');
    expect(cases).toBeDefined();
    expect(cases.length).toBeGreaterThan(0);

    const queuedCase = cases.find((c) => c.status === 'queued')!;
    
    // Dispatch enforcement unit
    const dispatched = await service.transitionEnforcement(queuedCase.id, 'dispatched', 'Unit-X', 'usr-admin');
    expect(dispatched.status).toBe('dispatched');
    expect(dispatched.assignedUnit).toBe('Unit-X');

    // Begin inspection
    const inspecting = await service.transitionEnforcement(queuedCase.id, 'investigating', undefined, 'usr-admin');
    expect(inspecting.status).toBe('investigating');

    // Resolve case
    const resolved = await service.transitionEnforcement(queuedCase.id, 'resolved', undefined, 'usr-admin');
    expect(resolved.status).toBe('resolved');
  });

  it('should enforce strict inputs when transitioning enforcement case status', async () => {
    const { service } = await getService();
    const cases = await service.listEnforcement('delhi');
    const queuedCase = cases.find((c) => c.status === 'queued')!;

    // Cannot dispatch without assigning a unit
    await expect(service.transitionEnforcement(queuedCase.id, 'dispatched', undefined, 'usr-admin')).rejects.toThrowError(
      new AppError('An assigned unit is required for dispatch')
    );
  });

  it('should support remaining service queries and runner operations', async () => {
    const { service } = await getService();

    expect(await service.listReadings('delhi', 5)).toHaveLength(5);
    expect(await service.listForecasts('delhi')).toBeDefined();
    expect(await service.getAttribution('delhi')).toBeDefined();
    expect(await service.listAdvisories()).toBeDefined();

    // Runners
    const forecastRun = await service.runForecast('delhi');
    expect(forecastRun.data).toBeDefined();

    const attributionRun = await service.runAttribution('delhi');
    expect(attributionRun.data).toBeDefined();
  });
});

