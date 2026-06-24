import { nanoid } from 'nanoid';
import type { AgentSuite, AdvisoryInput, AttributionInput, CorrelationOutput, EnforcementInput, ForecastInput } from '../ai/agents.js';
import type { Advisory, Alert, AlertStatus, DashboardOverview, EnforcementCase, EnforcementStatus, Severity } from '../domain/models.js';
import { AppError, NotFoundError } from './errors.js';
import type { AirIqRepository, Clock } from './ports.js';
import { systemClock } from './ports.js';
import { emailService } from './email-service.js';

const transitions: Record<AlertStatus, AlertStatus[]> = { open: ['acknowledged', 'resolved'], acknowledged: ['resolved', 'open'], resolved: [] };
const enforcementTransitions: Record<EnforcementStatus, EnforcementStatus[]> = { queued: ['dispatched'], dispatched: ['investigating', 'resolved'], investigating: ['resolved'], resolved: [] };

export class AirIqService {
  constructor(
    private readonly repository: AirIqRepository,
    private readonly agents: AgentSuite,
    private readonly dailyBudgetUsd: number,
    private readonly clock: Clock = systemClock,
  ) {}

  async getOverview(cityId: string): Promise<DashboardOverview> {
    const city = await this.repository.getCity(cityId);
    if (!city) throw new NotFoundError('City');
    const [readings, storedForecasts, storedAttribution, alerts, enforcement, citizensAlerted] = await Promise.all([
      this.repository.listReadings(cityId, 24),
      this.repository.listForecasts(cityId),
      this.repository.getAttribution(cityId),
      this.repository.listAlerts({ cityId }),
      this.repository.listEnforcement(cityId),
      this.repository.countCitizensAlerted(cityId),
    ]);
    const context = this.agentContext();
    const forecasts = storedForecasts.length ? storedForecasts : (await this.agents.forecast.run({ city, readings } satisfies ForecastInput, context)).data;
    const attribution = storedAttribution ?? (await this.agents.attribution.run({ cityId, ward: 'Citywide', readings } satisfies AttributionInput, context)).data;
    const forecastDelta = (forecasts.find((item) => item.horizonHours >= 6)?.predictedAqi ?? city.aqi) - city.aqi;
    return {
      city,
      forecastDelta,
      activeAlerts: alerts.filter((item) => item.status !== 'resolved').length,
      enforcementActions: enforcement.filter((item) => item.status !== 'resolved').length,
      citizensAlerted,
      sensorUptime: 99.4,
      readings,
      forecasts,
      attribution,
      insight: attribution.explanation,
    };
  }

  listCities() { return this.repository.listCities(); }
  listReadings(cityId: string, limit?: number) { return this.repository.listReadings(cityId, limit); }
  listForecasts(cityId: string, ward?: string) { return this.repository.listForecasts(cityId, ward); }
  getAttribution(cityId: string, ward?: string) { return this.repository.getAttribution(cityId, ward); }
  listAlerts(filters?: { cityId?: string; status?: string; severity?: string }) { return this.repository.listAlerts(filters); }
  listAdvisories(cityId?: string) { return this.repository.listAdvisories(cityId); }
  listEnforcement(cityId?: string) { return this.repository.listEnforcement(cityId); }

  async createAlert(input: { cityId: string; ward: string; title: string; description: string; severity: Severity; source: string }, actorId: string): Promise<Alert> {
    if (!(await this.repository.getCity(input.cityId))) throw new NotFoundError('City');
    const timestamp = this.clock.now().toISOString();
    const alert: Alert = { id: `alert-${nanoid(10)}`, ...input, status: 'open', createdAt: timestamp, updatedAt: timestamp };
    await this.repository.saveAlert(alert);
    await this.audit(actorId, 'alert.created', 'alert', alert.id, { severity: alert.severity });

    // Notify operational staff (non-blocking)
    this.repository.listUsers().then((users) => {
      const ops = users.filter(u => u.active && (u.role === 'city_admin' || u.role === 'enforcement_officer'));
      for (const op of ops) {
        emailService.sendAlert(op.email, {
          ward: alert.ward,
          title: alert.title,
          description: alert.description,
          severity: alert.severity,
        }).catch(err => console.error('Failed to send alert email:', err));
      }
    }).catch(err => console.error('Failed to fetch users for alert dispatch:', err));

    return alert;
  }

  async transitionAlert(id: string, status: AlertStatus, actorId: string): Promise<Alert> {
    const alert = await this.repository.getAlert(id);
    if (!alert) throw new NotFoundError('Alert');
    if (!transitions[alert.status].includes(status)) throw new AppError(`Cannot transition alert from ${alert.status} to ${status}`, 409, 'INVALID_TRANSITION');
    const updated: Alert = {
      ...alert,
      status,
      updatedAt: this.clock.now().toISOString(),
      ...(status === 'acknowledged'
        ? { assignedTo: actorId }
        : alert.assignedTo !== undefined
        ? { assignedTo: alert.assignedTo }
        : {})
    };
    await this.repository.saveAlert(updated);
    await this.audit(actorId, `alert.${status}`, 'alert', id, {});
    return updated;
  }

  async createAdvisory(input: AdvisoryInput & { status: Advisory['status']; reach?: number }, actorId: string): Promise<Advisory> {
    if (!(await this.repository.getCity(input.cityId))) throw new NotFoundError('City');
    const generated = await this.agents.advisory.run(input, this.agentContext());
    const timestamp = this.clock.now().toISOString();
    const advisory: Advisory = { id: `adv-${nanoid(10)}`, cityId: input.cityId, ward: input.ward, severity: generated.data.severity, audience: input.audience, channels: input.channels, message: generated.data.message, status: input.status, reach: input.status === 'published' ? input.reach ?? 0 : 0, createdAt: timestamp, ...(input.status === 'published' ? { publishedAt: timestamp } : {}) };
    await this.repository.saveAdvisory(advisory);
    await this.audit(actorId, `advisory.${input.status}`, 'advisory', advisory.id, { channels: input.channels });

    if (input.status === 'published') {
      this.broadcastAdvisory(advisory);
    }

    return advisory;
  }

  async publishAdvisory(id: string, reach: number, actorId: string): Promise<Advisory> {
    const item = (await this.repository.listAdvisories()).find((advisory) => advisory.id === id);
    if (!item) throw new NotFoundError('Advisory');
    if (item.status === 'published') throw new AppError('Advisory is already published', 409, 'ALREADY_PUBLISHED');
    const published: Advisory = { ...item, status: 'published', reach, publishedAt: this.clock.now().toISOString() };
    await this.repository.saveAdvisory(published);
    await this.audit(actorId, 'advisory.published', 'advisory', id, { reach });

    this.broadcastAdvisory(published);

    return published;
  }

  private broadcastAdvisory(advisory: Advisory) {
    this.repository.listUsers().then((users) => {
      const activeUsers = users.filter(u => u.active);
      for (const user of activeUsers) {
        emailService.sendAdvisory(user.email, {
          ward: advisory.ward,
          message: advisory.message,
          severity: advisory.severity,
          audience: advisory.audience,
        }).catch(err => console.error('Failed to broadcast advisory email:', err));
      }
    }).catch(err => console.error('Failed to fetch users for advisory broadcast:', err));
  }

  async generateEnforcement(cityId: string, actorId: string): Promise<EnforcementCase[]> {
    const [attribution, alerts] = await Promise.all([this.repository.getAttribution(cityId), this.repository.listAlerts({ cityId, status: 'open' })]);
    if (!attribution) throw new NotFoundError('Attribution');
    const result = await this.agents.enforcement.run({ cityId, attribution, alerts } satisfies EnforcementInput, this.agentContext());
    const timestamp = this.clock.now().toISOString();
    const cases = await Promise.all(result.data.map((item) => this.repository.saveEnforcement({ ...item, id: `case-${nanoid(10)}`, createdAt: timestamp, updatedAt: timestamp })));
    await this.audit(actorId, 'enforcement.generated', 'city', cityId, { count: cases.length });
    return cases;
  }

  async transitionEnforcement(id: string, status: EnforcementStatus, assignedUnit: string | undefined, actorId: string): Promise<EnforcementCase> {
    const item = (await this.repository.listEnforcement()).find((entry) => entry.id === id);
    if (!item) throw new NotFoundError('Enforcement case');
    if (!enforcementTransitions[item.status].includes(status)) throw new AppError(`Cannot transition case from ${item.status} to ${status}`, 409, 'INVALID_TRANSITION');
    if (status === 'dispatched' && !assignedUnit) throw new AppError('An assigned unit is required for dispatch');
    const updated: EnforcementCase = { ...item, status, ...(assignedUnit ? { assignedUnit } : {}), updatedAt: this.clock.now().toISOString() };
    await this.repository.saveEnforcement(updated);
    await this.audit(actorId, `enforcement.${status}`, 'enforcement_case', id, { assignedUnit });
    return updated;
  }

  async correlateAlerts(cityId: string): Promise<CorrelationOutput> {
    const alerts = await this.repository.listAlerts({ cityId });
    return (await this.agents.correlation.run({ alerts }, this.agentContext())).data;
  }

  async runForecast(cityId: string) {
    const city = await this.repository.getCity(cityId);
    if (!city) throw new NotFoundError('City');
    const readings = await this.repository.listReadings(cityId, 24);
    return this.agents.forecast.run({ city, readings }, this.agentContext());
  }

  async runAttribution(cityId: string, ward = 'Citywide') {
    if (!(await this.repository.getCity(cityId))) throw new NotFoundError('City');
    const readings = await this.repository.listReadings(cityId, 100);
    return this.agents.attribution.run({ cityId, ward, readings }, this.agentContext());
  }

  private agentContext() { return { traceId: nanoid(), budgetRemainingUsd: this.dailyBudgetUsd, attempt: 1 }; }
  private audit(actorId: string, action: string, entityType: string, entityId: string, metadata: Record<string, unknown>) { return this.repository.appendAudit({ id: `audit-${nanoid(12)}`, actorId, action, entityType, entityId, metadata, createdAt: this.clock.now().toISOString() }); }
}
