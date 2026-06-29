import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  BellRing,
  Check,
  CircleGauge,
  CloudSun,
  Cross,
  Database,
  FileDown,
  Filter,
  HeartPulse,
  KeyRound,
  Layers3,
  LocateFixed,
  MapPin,
  Radio,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  Siren,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserCog,
  Users,
  Wind,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { api } from '../lib/api';
import { formatNumber, relativeTime } from '../lib/aqi';
import { copyRowsToClipboard, downloadCsv } from '../lib/csv';
import type { Alert, AuditEvent, CityComparison, EnforcementCase, HistoricalReading, SensorReading } from '../lib/types';
import { AttributionBars, CityTrendChart, ConfidenceChart, ContributionComparison, ForecastChart, Sparkline } from '../components/Charts';
import { MapPanel } from '../components/MapPanel';
import { AqiBadge, AqiBand, EmptyState, ErrorState, IntelligenceBrief, LoadingState, MetricCard, PageHeader, PaginationControls, Panel, StatusChip } from '../components/Ui';
import { useCity } from '../context/CityContext';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';

const advisorySchema = z.object({
  ward: z.string().min(2, 'Enter a ward or zone'),
  aqi: z.coerce.number().int().min(0, 'AQI cannot be negative').max(999, 'AQI must be under 999'),
  reach: z.coerce.number().int().nonnegative('Reach cannot be negative'),
  publish: z.boolean().optional(),
});

type AdvisoryForm = z.input<typeof advisorySchema>;
const nameSchema = z.object({ firstName: z.string().min(1, 'First name is required'), lastName: z.string().min(1, 'Last name is required') });
const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
  confirmPassword: z.string().min(8, 'Confirm your new password'),
}).refine((value) => value.newPassword === value.confirmPassword, { message: 'Passwords do not match', path: ['confirmPassword'] });

export function DashboardPage() {
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['overview', activeCityId], queryFn: () => api.overview(activeCityId), refetchInterval: false });
  const [selectedState, setSelectedState] = useState<{ cityId: string; reading?: SensorReading }>({ cityId: activeCityId });
  const selected = selectedState.cityId === activeCityId ? selectedState.reading : undefined;

  if (query.isLoading) return <LoadingState />;
  if (query.error || !query.data) return <ErrorState message={query.error?.message ?? 'Overview unavailable'} retry={() => void query.refetch()} />;

  const data = query.data;
  return <div className="page dashboard-page">
    <PageHeader eyebrow="EXECUTIVE COMMAND CENTER" title={`${data.city.name} Air Operations`} description="Live atmospheric intelligence and coordinated response across the monitoring grid." actions={<><button className="button secondary"><FileDown />Export brief</button><Link className="button primary" to="/alerts"><Siren />Open alerts</Link></>} />
    <div className="metric-grid five">
      <MetricCard label="CURRENT AQI" value={data.city.aqi} delta="+18 / 3H" tone="danger" icon={<Wind />} />
      <MetricCard label="24H FORECAST" value={data.city.aqi + data.forecastDelta} delta={`${data.forecastDelta > 0 ? '+' : ''}${data.forecastDelta} AQI`} tone="warning" icon={<CloudSun />} />
      <MetricCard label="ACTIVE ALERTS" value={data.activeAlerts} delta="+2 since 12:00" tone="danger" icon={<BellRing />} />
      <MetricCard label="ENFORCEMENT ACTIONS" value={data.enforcementActions} delta="-1 pending" tone="success" icon={<ShieldCheck />} />
      <MetricCard label="SENSOR UPTIME" value={data.sensorUptime} unit="%" delta="+0.2%" tone="success" icon={<Radio />} />
    </div>
    <Panel className="aqi-band-panel" title="AQI health band" subtitle={`Last updated ${relativeTime(data.city.updatedAt)}`}>
      <AqiBand value={data.city.aqi} />
    </Panel>
    <div className="dashboard-grid">
      <MapPanel readings={data.readings} selected={selected ?? data.readings[0]} onSelect={(reading) => setSelectedState({ cityId: activeCityId, reading })} className="dashboard-map" />
      <div className="dashboard-side">
        <Panel title="AQI trajectory" subtitle="Observed + 72 hour forecast"><ForecastChart data={data.forecasts} /></Panel>
        <IntelligenceBrief><p>{data.insight}</p><div className="brief-actions"><Link to="/attribution">View attribution <ArrowRight /></Link><span>{Math.round(data.attribution.confidence * 100)}% confidence</span></div></IntelligenceBrief>
      </div>
    </div>
    <div className="two-column-grid">
      <Panel title="Dominant pollution sources" subtitle="Estimated contribution to citywide PM2.5" action={<Link to="/attribution" className="text-link">Full analysis <ArrowRight /></Link>}><AttributionBars attribution={data.attribution} /></Panel>
      <Panel title="Operational pulse" subtitle="Current response reach and priorities"><div className="pulse-grid"><div><Users /><strong>{formatNumber(data.citizensAlerted)}</strong><span>citizens reached</span></div><div><Siren /><strong>{data.activeAlerts}</strong><span>active incidents</span></div><div><ShieldCheck /><strong>{data.enforcementActions}</strong><span>field actions</span></div><div><Database /><strong>{data.readings.length}</strong><span>recent samples</span></div></div></Panel>
    </div>
  </div>;
}

export function AttributionPage() {
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['overview', activeCityId], queryFn: () => api.overview(activeCityId) });
  const run = useMutation({ mutationFn: () => api.attribution(activeCityId) });
  if (query.isLoading) return <LoadingState label="Resolving pollution signatures" />;
  if (query.error || !query.data) return <ErrorState message={query.error?.message ?? 'Attribution unavailable'} retry={() => void query.refetch()} />;
  const attribution = run.data ?? query.data.attribution;
  return <div className="page">
    <PageHeader eyebrow="POLLUTION ATTRIBUTION ENGINE" title="Source Intelligence" description="Explainable source apportionment from sensor ratios, weather, traffic, and regional transport." actions={<button className="button primary" onClick={() => run.mutate()} disabled={run.isPending}><Sparkles />{run.isPending ? 'Analyzing...' : 'Run new analysis'}</button>} />
    <div className="metric-grid four"><MetricCard label="MODEL CONFIDENCE" value={Math.round(attribution.confidence * 100)} unit="%" tone="success" icon={<CircleGauge />} /><MetricCard label="DOMINANT SOURCE" value={attribution.sources[0]?.source ?? 'Unknown'} tone="danger" icon={<TrendingUp />} /><MetricCard label="ANALYSIS ZONE" value={attribution.ward} icon={<MapPin />} /><MetricCard label="INPUT FEEDS" value="12 / 12" tone="success" icon={<Database />} /></div>
    <div className="attribution-layout">
      <Panel title="Source contribution matrix" subtitle="Calibrated citywide estimate"><div className="source-donut-wrap"><div className="source-donut" style={{ background: `conic-gradient(#ff6d6d 0 ${attribution.sources[0]?.contribution ?? 45}%, #ffb84d 0 ${(attribution.sources[0]?.contribution ?? 45) + (attribution.sources[1]?.contribution ?? 30)}%, #54d8ff 0 90%, #778b98 0)` }}><span><strong>PM2.5</strong><small>SOURCE MIX</small></span></div><AttributionBars attribution={attribution} /></div></Panel>
      <Panel title="Spatial evidence" subtitle="Correlated sensor clusters"><MapPanel readings={query.data.readings} selected={query.data.readings[2]} /></Panel>
    </div>
    <IntelligenceBrief title="Attribution rationale"><p>{attribution.explanation}</p><div className="evidence-tags"><span>NO2 / PM ratio</span><span>Wind vector</span><span>Traffic velocity</span><span>Thermal inversion</span></div></IntelligenceBrief>
  </div>;
}

export function ForecastingPage() {
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['overview', activeCityId], queryFn: () => api.overview(activeCityId) });
  const [horizon, setHorizon] = useState(24);
  if (query.isLoading) return <LoadingState label="Loading hyperlocal forecast lattice" />;
  if (query.error || !query.data) return <ErrorState message={query.error?.message ?? 'Forecast unavailable'} retry={() => void query.refetch()} />;
  const data = query.data;
  const point = data.forecasts.find((item) => item.horizonHours >= horizon) ?? data.forecasts.at(-1)!;
  return <div className="page">
    <PageHeader eyebrow="HYPERLOCAL AQI FORECASTING" title="Atmospheric Outlook" description="Probabilistic AQI predictions at one-kilometre resolution, updated every fifteen minutes." actions={<div className="segmented" role="group" aria-label="Forecast horizon">{[6, 24, 72].map((value) => <button className={horizon === value ? 'active' : ''} onClick={() => setHorizon(value)} key={value}>{value}H</button>)}</div>} />
    <div className="forecast-hero">
      <Panel className="forecast-map-panel" title={`${horizon}-hour dispersion field`} subtitle={`Valid through ${new Date(point.predictedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}><MapPanel readings={data.readings.map((item, index) => ({ ...item, aqi: Math.round(item.aqi + data.forecastDelta * ((index + 3) / 10)) }))} selected={data.readings[0]} /></Panel>
      <div className="forecast-summary"><AqiBadge value={point.predictedAqi} /><div className="forecast-range"><span>EXPECTED RANGE</span><strong>{point.lowerBound}-{point.upperBound}</strong></div><div className="forecast-confidence"><span>MODEL CONFIDENCE</span><strong>{Math.round(point.confidence * 100)}%</strong></div><div className="driver-list"><span>PRIMARY DRIVERS</span>{point.drivers.map((driver) => <div key={driver}><Wind />{driver}</div>)}</div></div>
    </div>
    <div className="two-column-grid wide-left"><Panel title="AQI trend forecast" subtitle="Prediction interval and central estimate"><ForecastChart data={data.forecasts} /></Panel><Panel title="Confidence decay" subtitle="Probability by horizon"><ConfidenceChart data={data.forecasts} /></Panel></div>
  </div>;
}

export function HealthPage() {
  const client = useQueryClient();
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['advisories', activeCityId], queryFn: () => api.advisories(activeCityId) });
  const overviewQuery = useQuery({ queryKey: ['overview', activeCityId], queryFn: () => api.overview(activeCityId) });
  const [showForm, setShowForm] = useState(false);
  const form = useForm<AdvisoryForm>({ resolver: zodResolver(advisorySchema), defaultValues: { ward: 'East Delhi', aqi: 378, reach: 250000, publish: false } });
  const mutation = useMutation({ mutationFn: api.createAdvisory, onSuccess: () => { void client.invalidateQueries({ queryKey: ['advisories'] }); setShowForm(false); form.reset(); } });
  const submit = form.handleSubmit((rawValue) => {
    const value = advisorySchema.parse(rawValue);
    mutation.mutate({ cityId: activeCityId, ward: value.ward, aqi: value.aqi, audience: ['children', 'older adults', 'respiratory patients'], channels: ['sms', 'push', 'public_display'], status: value.publish ? 'published' : 'draft', reach: value.reach });
  });
  return <div className="page">
    <PageHeader eyebrow="CITIZEN HEALTH ADVISORY" title="Health Advisory Command" description="Create, approve, and broadcast localized guidance for high-risk populations." actions={<button className="button primary" onClick={() => setShowForm((value) => !value)}><Send />New advisory</button>} />
    <div className="metric-grid four"><MetricCard label="CITIZENS ALERTED TODAY" value={428_190} tone="primary" icon={<Users />} /><MetricCard label="HIGH-RISK WARDS" value={8} tone="danger" icon={<HeartPulse />} /><MetricCard label="DELIVERY RATE" value={98.7} unit="%" tone="success" icon={<Check />} /><MetricCard label="ACTIVE BROADCASTS" value={3} tone="warning" icon={<Radio />} /></div>
    {showForm && <Panel className="form-panel" title="Compose AI-assisted advisory" subtitle="The health agent will produce evidence-aligned language for the selected AQI."><form className="advisory-form" onSubmit={submit}><label>Ward or zone<input {...form.register('ward')} />{form.formState.errors.ward && <small className="field-error">{form.formState.errors.ward.message}</small>}</label><label>Current AQI<input type="number" {...form.register('aqi')} />{form.formState.errors.aqi && <small className="field-error">{form.formState.errors.aqi.message}</small>}</label><label>Estimated reach<input type="number" {...form.register('reach')} />{form.formState.errors.reach && <small className="field-error">{form.formState.errors.reach.message}</small>}</label><label className="checkbox-label"><input type="checkbox" {...form.register('publish')} />Publish immediately after generation</label><div className="form-actions"><button type="button" className="button ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary" disabled={mutation.isPending}><Sparkles />{mutation.isPending ? 'Generating...' : 'Generate advisory'}</button></div>{mutation.error && <div className="form-error">{mutation.error.message}</div>}</form></Panel>}
    <div className="health-layout"><Panel title="Population risk map" subtitle="Vulnerability-weighted exposure zones"><div className="risk-map"><MapPanel readings={overviewQuery.data?.readings ?? []} /></div></Panel><Panel title="Risk cohorts" subtitle="Estimated exposure requiring intervention"><div className="cohort-list">{[['Children under 12', '186K', 'critical'], ['Older adults', '142K', 'critical'], ['Respiratory patients', '89K', 'warning'], ['Outdoor workers', '64K', 'warning']].map(([label, value, status]) => <div key={label}><span><i className={`cohort-${status}`} />{label}</span><strong>{value}</strong></div>)}</div></Panel></div>
    <Panel title="Broadcast ledger" subtitle="Recent public-health communications">{query.isLoading ? <LoadingState label="Loading broadcasts" /> : query.error ? <ErrorState message={query.error.message} /> : !query.data?.length ? <EmptyState title="No advisories" description="Create the first localized advisory." /> : <div className="advisory-list">{query.data.map((item) => <article key={item.id}><div className="advisory-icon"><Cross /></div><div><div className="advisory-title"><strong>{item.ward}</strong><StatusChip value={item.status} /><StatusChip value={item.severity} /></div><p>{item.message}</p><small>{item.channels.join(' - ')} - {item.publishedAt ? relativeTime(item.publishedAt) : 'Not published'}</small></div><div className="advisory-reach"><strong>{formatNumber(item.reach)}</strong><span>REACHED</span></div></article>)}</div>}</Panel>
  </div>;
}

export function EnforcementPage() {
  const client = useQueryClient();
  const { activeCityId } = useCity();
  const [page, setPage] = useState(1);
  const query = useQuery({ queryKey: ['enforcement', activeCityId, page], queryFn: () => api.enforcementPage({ cityId: activeCityId, page, limit: 5 }) });
  const generate = useMutation({ mutationFn: () => api.generateEnforcement(activeCityId), onSuccess: () => void client.invalidateQueries({ queryKey: ['enforcement'] }) });
  const transition = useMutation({ mutationFn: ({ item, status }: { item: EnforcementCase; status: EnforcementCase['status'] }) => api.updateEnforcement(item.id, status, status === 'dispatched' ? 'Alpha-7' : item.assignedUnit), onSuccess: () => void client.invalidateQueries({ queryKey: ['enforcement'] }) });
  const cases = query.data?.data ?? [];
  return <div className="page">
    <PageHeader eyebrow="ENFORCEMENT INTELLIGENCE" title="Prioritized Target Matrix" description="Evidence-ranked interventions optimized for immediate air-quality impact." actions={<button className="button primary" onClick={() => generate.mutate()} disabled={generate.isPending}><Sparkles />{generate.isPending ? 'Prioritizing...' : 'Generate priorities'}</button>} />
    <div className="metric-grid four"><MetricCard label="OPEN CASES" value={cases.filter((item) => item.status !== 'resolved').length} tone="warning" icon={<ShieldCheck />} /><MetricCard label="UNITS DEPLOYED" value={2} tone="success" icon={<LocateFixed />} /><MetricCard label="EST. AQI IMPACT" value="-38" unit=" AQI" tone="success" icon={<TrendingDown />} /><MetricCard label="EVIDENCE FEEDS" value="9 / 9" tone="primary" icon={<Database />} /></div>
    <IntelligenceBrief><p>Industrial plume evidence in Okhla has the strongest confidence-to-impact ratio. Dispatch within 45 minutes to preserve the observable emissions window.</p></IntelligenceBrief>
    <Panel title="Action queue" subtitle="Ranked by impact, urgency, confidence, and deployability" action={<button className="button ghost"><Filter />Filters</button>}>{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : !cases.length ? <EmptyState title="Queue clear" description="No enforcement targets require action." /> : <><div className="enforcement-list">{cases.map((item, index) => <article key={item.id}><div className="priority-rank"><span>{String((page - 1) * (query.data?.limit ?? 5) + index + 1).padStart(2, '0')}</span><strong>{item.priority}</strong><small>PRIORITY</small></div><div className="enforcement-main"><div><StatusChip value={item.status} /><span className="case-category">{item.category}</span></div><h3>{item.target}</h3><p><MapPin />{item.ward}</p><div className="case-metrics"><span>Evidence <strong>{Math.round(item.evidenceScore * 100)}%</strong></span><span>Est. impact <strong>-{item.estimatedImpact} AQI</strong></span>{item.assignedUnit && <span>Unit <strong>{item.assignedUnit}</strong></span>}</div></div><div className="case-actions">{item.status === 'queued' && <button className="button primary" onClick={() => transition.mutate({ item, status: 'dispatched' })}><Send />Dispatch unit</button>}{item.status === 'dispatched' && <button className="button secondary" onClick={() => transition.mutate({ item, status: 'investigating' })}>Begin inspection</button>}{item.status === 'investigating' && <button className="button secondary" onClick={() => transition.mutate({ item, status: 'resolved' })}><Check />Resolve</button>}{item.status === 'resolved' && <StatusChip value="complete" />}</div></article>)}</div>{query.data && <PaginationControls {...query.data} onPage={setPage} />}</>}</Panel>
  </div>;
}

export function CitiesPage() {
  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities });
  if (cities.isLoading) return <LoadingState label="Synchronizing national monitoring grids" />;
  if (cities.error || !cities.data) return <ErrorState message={cities.error?.message ?? 'City data unavailable'} retry={() => void cities.refetch()} />;
  return <div className="page">
    <PageHeader eyebrow="MULTI-CITY INTELLIGENCE" title="National Air Picture" description="Real-time benchmarking and comparative analytics across monitored urban grids." actions={<button className="button secondary"><RefreshCw />Live sync</button>} />
    <div className="cities-layout"><Panel title="National AQI ranking" subtitle="Latest calibrated city readings"><div className="city-ranking">{cities.data.map((city, index) => <article key={city.id}><span className="city-rank">{String(index + 1).padStart(2, '0')}</span><div><strong>{city.name}</strong><small>{city.state}</small></div><Sparkline values={Array.from({ length: 24 }, (_, hour) => Math.max(20, Math.round(city.aqi + Math.sin(hour / 2 + index) * 18)))} /><AqiBadge value={city.aqi} compact />{city.trend === 'up' ? <ArrowUp className="trend-up" /> : city.trend === 'down' ? <ArrowDown className="trend-down" /> : <ArrowRight />}</article>)}</div></Panel><Panel title="Comparative AQI trajectory" subtitle="Seven-day moving average"><CityTrendChart cities={cities.data} /><div className="chart-legend">{cities.data.slice(0, 4).map((city, index) => <span key={city.id}><i className={`legend-color-${index}`} />{city.name}</span>)}</div></Panel></div>
    <div className="two-column-grid wide-left"><Panel title="Pollution source profiles" subtitle="Estimated contribution by city"><ContributionComparison cities={cities.data} /></Panel><Panel title="Intervention efficacy" subtitle="30-day impact against baseline"><div className="efficacy-list">{[['Bengaluru', '-14.2%', true], ['Mumbai', '-8.7%', true], ['Delhi', '+2.1%', false]].map(([city, value, good]) => <div key={String(city)}><span>{city}</span><strong className={good ? 'positive' : 'negative'}>{good ? <TrendingDown /> : <TrendingUp />}{value}</strong></div>)}</div></Panel></div>
  </div>;
}

export function ComparePage() {
  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities });
  const [selected, setSelected] = useState(['delhi', 'mumbai', 'bengaluru']);
  const query = useQuery({ queryKey: ['city-compare', selected], queryFn: () => api.compareCities(selected, 7), enabled: selected.length >= 2 });
  const chartRows = useMemo(() => {
    const byDate = new Map<string, Record<string, string | number>>();
    for (const item of query.data ?? []) {
      for (const reading of item.readings) {
        const key = new Date(reading.observedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
        byDate.set(key, { ...(byDate.get(key) ?? { day: key }), [item.city.name]: reading.aqi });
      }
    }
    return [...byDate.values()].slice(-28);
  }, [query.data]);
  const colors = ['#54d8ff', '#ffb84d', '#47e6a5'];
  const toggleCity = (cityId: string) => {
    setSelected((current) => current.includes(cityId) ? current.filter((id) => id !== cityId) : [...current, cityId].slice(-3));
  };
  return <div className="page">
    <PageHeader eyebrow="CITY COMPARISON" title="Compare Cities" description="Benchmark AQI movement and current pollution context across two or three monitored cities." />
    <Panel title="Select cities" subtitle="Choose up to three cities for a seven-day AQI comparison">
      <div className="compare-picker">{cities.data?.map((city) => <label key={city.id}><input type="checkbox" checked={selected.includes(city.id)} onChange={() => toggleCity(city.id)} />{city.name}</label>)}</div>
    </Panel>
    <Panel title="7-day AQI trend" subtitle="One line per selected city">
      {query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : <div className="chart"><CityCompareChart data={chartRows} series={(query.data ?? []).map((item) => item.city.name)} colors={colors} /></div>}
    </Panel>
    <Panel title="Current comparison" subtitle="Latest city status and dominant pollutant">
      <div className="table-wrap compare-table"><table><thead><tr><th>City</th><th>Current AQI</th><th>Dominant pollutant</th><th>Trend</th><th>Last reading</th></tr></thead><tbody>{(query.data ?? []).map((item: CityComparison) => <tr key={item.city.id}><td><strong>{item.city.name}</strong></td><td>{item.city.aqi}</td><td>{item.dominantPollutant}</td><td>{item.trend === 'up' ? 'Up' : item.trend === 'down' ? 'Down' : 'Stable'}</td><td>{item.lastReadingTime ? relativeTime(item.lastReadingTime) : 'No reading'}</td></tr>)}</tbody></table></div>
    </Panel>
  </div>;
}

export function AlertsPage() {
  const client = useQueryClient();
  const { activeCityId } = useCity();
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Number(searchParams.get('page') ?? '1');
  const filters = {
    search: searchParams.get('search') ?? '',
    status: searchParams.get('status') ?? '',
    severity: searchParams.get('severity') ?? '',
    cityId: searchParams.get('cityId') ?? activeCityId,
  };
  const setFilterParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value); else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };
  const setPage = (nextPage: number) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', String(nextPage));
    setSearchParams(next);
  };
  const alerts = useQuery({ queryKey: ['alerts', filters, page], queryFn: () => api.alertsPage({ ...filters, page, limit: 8 }), refetchInterval: false });
  const correlations = useQuery({ queryKey: ['correlations', activeCityId], queryFn: () => api.correlateAlerts(activeCityId) });
  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities });
  const [selected, setSelected] = useState<Alert>();
  const mutation = useMutation({ mutationFn: ({ item, status }: { item: Alert; status: Alert['status'] }) => api.updateAlert(item.id, status), onSuccess: () => { void client.invalidateQueries({ queryKey: ['alerts'] }); setSelected(undefined); } });
  const rows = alerts.data?.data ?? [];
  const exportRows = () => {
    downloadCsv('airiq-alerts.csv', rows as unknown as Array<Record<string, unknown>>);
    toast.success('Alerts exported as CSV.');
  };
  const copyRows = async () => {
    if (await copyRowsToClipboard(rows as unknown as Array<Record<string, unknown>>)) toast.success('Alerts copied for spreadsheets.');
  };
  return <div className="page alerts-page">
    <PageHeader eyebrow="ALERT MANAGEMENT CENTER" title="Mission Feed" description="Correlated incidents, system anomalies, and operational response in one live queue." actions={<><button className="button secondary" onClick={copyRows} disabled={!rows.length}>Copy</button><button className="button primary" onClick={exportRows} disabled={!rows.length}><FileDown />Export CSV</button></>} />
    <Panel title="Filters" subtitle="Filter state is stored in the URL for shareable views"><div className="alert-filter-bar"><input placeholder="Search alert text" value={filters.search} onChange={(event) => setFilterParam('search', event.target.value)} /><select value={filters.status} onChange={(event) => setFilterParam('status', event.target.value)}><option value="">All status</option><option value="active">Active</option><option value="acknowledged">Acknowledged</option><option value="resolved">Resolved</option></select><select value={filters.severity} onChange={(event) => setFilterParam('severity', event.target.value)}><option value="">All severity</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option><option value="critical">Critical</option></select><select value={filters.cityId} onChange={(event) => setFilterParam('cityId', event.target.value)}>{cities.data?.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select><button className="button ghost" onClick={() => setSearchParams(new URLSearchParams())}>Clear filters</button></div></Panel>
    <div className="alert-layout"><Panel className="alert-feed" title="Live alert feed" subtitle={`${rows.length} signals in current view`}>{alerts.isLoading ? <LoadingState /> : alerts.error ? <ErrorState message={alerts.error.message} /> : !rows.length ? <EmptyState title="No matching alerts" description="The selected queue is clear." /> : <><div className="alert-list">{rows.map((item) => <button key={item.id} className={`alert-card severity-${item.severity} ${selected?.id === item.id ? 'selected' : ''}`} onClick={() => setSelected(item)}><div><StatusChip value={item.severity} /><StatusChip value={item.status} />{!item.readAt && <StatusChip value="unread" />}<span>{relativeTime(item.createdAt)}</span></div><strong>{item.title}</strong><p>{item.description}</p><small>{item.source} - {item.ward}</small></button>)}</div>{alerts.data && <PaginationControls {...alerts.data} onPage={setPage} />}</>}</Panel><div className="alert-intelligence"><Panel title="Alert correlation AI" subtitle="Related signals grouped by time and location">{correlations.isLoading ? <LoadingState /> : <div className="correlation-list">{correlations.data?.clusters.map((cluster) => <article key={cluster.id}><Layers3 /><div><strong>{cluster.summary}</strong><span>{cluster.alertIds.length} source signals - {Math.round(cluster.confidence * 100)}% confidence</span></div><StatusChip value={cluster.severity} /></article>)}</div>}</Panel>{selected ? <Panel className="selected-alert" title="Selected incident" subtitle={selected.id}><div className="incident-title"><Siren /><div><StatusChip value={selected.severity} /><h3>{selected.title}</h3></div></div><p>{selected.description}</p><dl><div><dt>LOCATION</dt><dd>{selected.ward}</dd></div><div><dt>SOURCE</dt><dd>{selected.source}</dd></div><div><dt>STATUS</dt><dd>{selected.status}</dd></div></dl><div className="form-actions">{!selected.readAt && <button className="button ghost" onClick={async () => { await api.markAlertRead(selected.id); toast.success('Alert marked read.'); await client.invalidateQueries({ queryKey: ['alerts'] }); setSelected(undefined); }}><Check />Mark read</button>}{selected.status === 'open' && <button className="button secondary" onClick={() => mutation.mutate({ item: selected, status: 'acknowledged' })}>Acknowledge</button>}{selected.status !== 'resolved' && <button className="button primary" onClick={() => mutation.mutate({ item: selected, status: 'resolved' })}><Check />Resolve incident</button>}</div></Panel> : <IntelligenceBrief><p>Select an alert to review evidence, ownership, and response controls.</p></IntelligenceBrief>}</div></div>
  </div>;
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const { activeCityId, setActiveCityId, cities } = useCity();
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return <div className="page narrow-page"><PageHeader eyebrow="SYSTEM CONFIGURATION" title="Settings" description="Operator preferences, model controls, and notification routing." /><form onSubmit={submit}><Panel title="Operational defaults" subtitle="Applied to your command center session"><div className="settings-grid"><label>Default city<select value={activeCityId} onChange={(e) => setActiveCityId(e.target.value)}>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label><label>Refresh cadence<select defaultValue="60"><option value="30">30 seconds</option><option value="60">1 minute</option><option value="300">5 minutes</option></select></label><label>Measurement units<select><option>Metric (ug/m3)</option><option>US EPA AQI</option></select></label><label>Timezone<select><option>Asia/Kolkata (IST)</option></select></label></div></Panel><Panel title="Notification routing" subtitle="Choose which signals interrupt your session"><div className="toggle-list">{[['Critical AQI incidents', 'Always notify for severe threshold crossings', true], ['Forecast threshold warnings', 'Notify two hours before predicted exceedance', true], ['Sensor data-quality issues', 'Notify when a sensor leaves calibration tolerance', false], ['Enforcement updates', 'Notify when field units change case status', true]].map(([title, description, checked]) => <label key={String(title)}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" defaultChecked={Boolean(checked)} /></label>)}</div></Panel><div className="settings-actions">{saved && <span className="save-confirmation"><Check />Settings saved</span>}<button className="button primary"><Settings />Save preferences</button></div></form></div>;
}

export function HistoricalPage() {
  const { activeCityId } = useCity();
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState(() => new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString().slice(0, 10));
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const query = useQuery({ queryKey: ['historical', activeCityId, from, to, page], queryFn: () => api.historicalPage({ cityId: activeCityId, from, to, page, limit: 20 }) });
  const rows = (query.data?.data ?? []) as unknown as Array<Record<string, unknown>>;
  const exportRows = () => { downloadCsv(`airiq-${activeCityId}-historical.csv`, rows); toast.success('Historical data exported.'); };
  const copyRows = async () => { if (await copyRowsToClipboard(rows)) toast.success('Historical data copied.'); };
  return <div className="page">
    <PageHeader eyebrow="HISTORICAL DATA" title="Historical Data" description="Review ETL readings by date range and export the current filtered page." actions={<><button className="button secondary" onClick={copyRows} disabled={!query.data?.data.length}>Copy</button><button className="button primary" onClick={exportRows} disabled={!query.data?.data.length}><FileDown />Export CSV</button></>} />
    <Panel title="Filters" subtitle="Server-side pagination keeps the table fast"><div className="historical-filters"><label>From<input type="date" value={from} onChange={(event) => { setFrom(event.target.value); setPage(1); }} /></label><label>To<input type="date" value={to} onChange={(event) => { setTo(event.target.value); setPage(1); }} /></label></div></Panel>
    <Panel title="Historical readings" subtitle={`${activeCityId.toUpperCase()} archive`}>{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : !query.data?.data.length ? <EmptyState title="No readings" description="Run the ETL pipeline to populate historical data." /> : <><div className="table-wrap"><table><thead><tr><th>Observed</th><th>Station</th><th>Ward</th><th>AQI</th><th>PM2.5</th><th>PM10</th><th>Source</th></tr></thead><tbody>{query.data.data.map((row: HistoricalReading) => <tr key={row.id}><td>{new Date(row.observedAt).toLocaleString('en-IN')}</td><td>{row.stationName}</td><td>{row.ward}</td><td>{row.aqi}</td><td>{row.pm25}</td><td>{row.pm10}</td><td>{row.source}</td></tr>)}</tbody></table></div><PaginationControls {...query.data} onPage={setPage} /></>}</Panel>
  </div>;
}

export function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const profile = useQuery({ queryKey: ['profile'], queryFn: api.profile });
  const client = useQueryClient();
  const [nameSaved, setNameSaved] = useState('');
  const [passwordSaved, setPasswordSaved] = useState('');
  const fullName = profile.data?.name ?? user?.name ?? '';
  const [firstName, ...rest] = fullName.split(' ');
  const nameForm = useForm<z.infer<typeof nameSchema>>({ resolver: zodResolver(nameSchema), values: { firstName: firstName || '', lastName: rest.join(' ') || '' } });
  const passwordForm = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const updateName = useMutation({ mutationFn: api.updateProfile, onSuccess: async () => { setNameSaved('Display name updated.'); toast.success('Display name updated.'); await client.invalidateQueries({ queryKey: ['profile'] }); } });
  const changePassword = useMutation({ mutationFn: ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => api.changePassword({ currentPassword, newPassword }), onSuccess: () => { setPasswordSaved('Password changed.'); toast.success('Password changed.'); passwordForm.reset(); } });
  return <div className="page narrow-page">
    <PageHeader eyebrow="OPERATOR PROFILE" title="Profile" description="Review your account details and keep your local operator profile current." />
    <Panel title="Account details" subtitle="Read-only identity fields">
      {profile.isLoading ? <LoadingState /> : <div className="profile-summary"><div><span>Name</span><strong>{profile.data?.name}</strong></div><div><span>Email</span><strong>{profile.data?.email}</strong></div><div><span>Role</span><strong>{profile.data?.role}</strong></div><div><span>Last login</span><strong>{profile.data?.lastLoginAt ? relativeTime(profile.data.lastLoginAt) : 'Not recorded'}</strong></div></div>}
    </Panel>
    {user?.demoMode && <IntelligenceBrief title="Demo Mode"><p>This account is read-only. Use the admin login to update profile data or perform write actions.</p></IntelligenceBrief>}
    <div className="two-column-grid">
      <Panel title="Change display name" subtitle="Shown in the top navigation">
        <form className="profile-form" onSubmit={nameForm.handleSubmit((value) => updateName.mutate(value))}><label>First name<input {...nameForm.register('firstName')} />{nameForm.formState.errors.firstName && <small className="field-error">{nameForm.formState.errors.firstName.message}</small>}</label><label>Last name<input {...nameForm.register('lastName')} />{nameForm.formState.errors.lastName && <small className="field-error">{nameForm.formState.errors.lastName.message}</small>}</label>{nameSaved && <div className="form-success">{nameSaved}</div>}{updateName.error && <div className="form-error">{updateName.error.message}</div>}<button className="button primary" disabled={updateName.isPending || user?.demoMode}><UserCog />Update name</button></form>
      </Panel>
      <Panel title="Change password" subtitle="Requires your current password">
        <form className="profile-form" onSubmit={passwordForm.handleSubmit((value) => changePassword.mutate({ currentPassword: value.currentPassword, newPassword: value.newPassword }))}><label>Current password<input type="password" {...passwordForm.register('currentPassword')} />{passwordForm.formState.errors.currentPassword && <small className="field-error">{passwordForm.formState.errors.currentPassword.message}</small>}</label><label>New password<input type="password" {...passwordForm.register('newPassword')} />{passwordForm.formState.errors.newPassword && <small className="field-error">{passwordForm.formState.errors.newPassword.message}</small>}</label><label>Confirm password<input type="password" {...passwordForm.register('confirmPassword')} />{passwordForm.formState.errors.confirmPassword && <small className="field-error">{passwordForm.formState.errors.confirmPassword.message}</small>}</label>{passwordSaved && <div className="form-success">{passwordSaved}</div>}{changePassword.error && <div className="form-error">{changePassword.error.message}</div>}<button className="button primary" disabled={changePassword.isPending || user?.demoMode}><KeyRound />Change password</button></form>
      </Panel>
    </div>
  </div>;
}

export function AdminPage() {
  const query = useQuery({ queryKey: ['users'], queryFn: api.users });
  return <div className="page"><PageHeader eyebrow="ACCESS CONTROL" title="Team & Access" description="Operators authorized to access AirIQ intelligence and response workflows." actions={<button className="button primary"><UserCog />Invite operator</button>} /><div className="metric-grid three"><MetricCard label="ACTIVE OPERATORS" value={query.data?.length ?? 0} icon={<Users />} /><MetricCard label="ADMINISTRATORS" value={query.data?.filter((user) => user.role === 'admin').length ?? 0} icon={<KeyRound />} /><MetricCard label="SECURITY POSTURE" value="Simple" tone="success" icon={<ShieldCheck />} /></div><Panel title="Operator directory" subtitle="Simple roles: admin, analyst, viewer">{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : <div className="table-wrap"><table><thead><tr><th>Operator</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{query.data?.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.role}</td><td><StatusChip value={user.active ? 'active' : 'disabled'} /></td></tr>)}</tbody></table></div>}</Panel></div>;
}

export function AdminAuditPage() {
  const [page, setPage] = useState(1);
  const [days, setDays] = useState(7);
  const [action, setAction] = useState('');
  const query = useQuery({ queryKey: ['audit', page, days, action], queryFn: () => api.auditEvents({ page, days, action: action || undefined }) });
  const actions = [...new Set((query.data?.data ?? []).map((event) => event.action))];
  return <div className="page">
    <PageHeader eyebrow="ADMIN AUDIT" title="Audit Log" description="Review security-relevant operator events and account changes." />
    <Panel title="Filters" subtitle="Filter by time window and action type"><div className="alert-filter-bar"><select value={days} onChange={(event) => { setDays(Number(event.target.value)); setPage(1); }}><option value={1}>Last 24h</option><option value={7}>Last 7 days</option><option value={30}>Last 30 days</option></select><select value={action} onChange={(event) => { setAction(event.target.value); setPage(1); }}><option value="">All actions</option>{actions.map((item) => <option key={item} value={item}>{item}</option>)}</select></div></Panel>
    <Panel title="Events" subtitle="Timestamped audit trail">{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : !query.data?.data.length ? <EmptyState title="No events" description="No audit events match the current filters." /> : <><div className="table-wrap"><table><thead><tr><th>Timestamp</th><th>User email</th><th>Action</th><th>Entity type</th><th>Entity ID</th><th>IP address</th></tr></thead><tbody>{query.data.data.map((event: AuditEvent) => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString('en-IN')}</td><td>{event.userEmail ?? 'Unknown'}</td><td>{event.action}</td><td>{event.entityType}</td><td>{event.entityId ?? '-'}</td><td>{event.ipAddress ?? '-'}</td></tr>)}</tbody></table></div><PaginationControls {...query.data} onPage={setPage} /></>}</Panel>
  </div>;
}

export function NotFoundPage() {
  return <div className="not-found"><div className="not-found-code">404</div><Radio /><h1>Signal not found</h1><p>The requested AirIQ route is outside the active monitoring grid.</p><Link to="/" className="button primary">Return to command center</Link></div>;
}

function CityCompareChart({ data, series, colors }: { data: Array<Record<string, string | number>>; series: string[]; colors: string[] }) {
  return <ResponsiveContainer width="100%" height="100%" minHeight={220}>
    <LineChart data={data} margin={{ top: 12, right: 18, bottom: 0, left: -16 }}>
      <CartesianGrid stroke="#20303c" strokeDasharray="2 4" vertical={false} />
      <XAxis dataKey="day" stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} />
      <YAxis stroke="#6e8492" axisLine={false} tickLine={false} fontSize={10} />
      <Tooltip contentStyle={{ background: '#101820', border: '1px solid #2a3946', borderRadius: 6, color: '#e7f1f5' }} />
      {series.map((name, index) => <Line key={name} type="monotone" dataKey={name} stroke={colors[index]} strokeWidth={2} dot={false} />)}
    </LineChart>
  </ResponsiveContainer>;
}
