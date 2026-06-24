import { useState, useEffect, type FormEvent } from 'react';
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
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { formatNumber, relativeTime } from '../lib/aqi';
import type { Alert, EnforcementCase, SensorReading } from '../lib/types';
import { AttributionBars, CityTrendChart, ConfidenceChart, ContributionComparison, ForecastChart } from '../components/Charts';
import { MapPanel } from '../components/MapPanel';
import { AqiBadge, EmptyState, ErrorState, IntelligenceBrief, LoadingState, MetricCard, PageHeader, Panel, StatusChip } from '../components/Ui';
import { useCity } from '../context/CityContext';

export function DashboardPage() {
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['overview', activeCityId], queryFn: () => api.overview(activeCityId), refetchInterval: 60_000 });
  const [selected, setSelected] = useState<SensorReading>();

  // Reset selected sensor reading when active city changes
  useEffect(() => {
    setSelected(undefined);
  }, [activeCityId]);
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
    <div className="dashboard-grid">
      <MapPanel readings={data.readings} selected={selected ?? data.readings[0]} onSelect={setSelected} className="dashboard-map" />
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
      <Panel title="Source contribution matrix" subtitle="Calibrated citywide estimate"><div className="source-donut-wrap"><div className="source-donut" style={{ background: `conic-gradient(#ff6d6d 0 ${attribution.sources[0]?.contribution ?? 45}%, #ffb84d 0 ${(attribution.sources[0]?.contribution ?? 45) + (attribution.sources[1]?.contribution ?? 30)}%, #54d8ff 0 90%, #778b98 0)` }}><span><strong>PM₂.₅</strong><small>SOURCE MIX</small></span></div><AttributionBars attribution={attribution} /></div></Panel>
      <Panel title="Spatial evidence" subtitle="Correlated sensor clusters"><MapPanel readings={query.data.readings} selected={query.data.readings[2]} /></Panel>
    </div>
    <IntelligenceBrief title="Attribution rationale"><p>{attribution.explanation}</p><div className="evidence-tags"><span>NO₂ / PM ratio</span><span>Wind vector</span><span>Traffic velocity</span><span>Thermal inversion</span></div></IntelligenceBrief>
    <Panel title="Evidence ledger" subtitle="Signals included in the current model run"><div className="table-wrap"><table><thead><tr><th>Evidence source</th><th>Signal</th><th>Weight</th><th>Quality</th><th>Direction</th></tr></thead><tbody>{[['Traffic telemetry','Average speed −38%','0.31','High','Rising'],['Meteorological feed','Wind 2.1 km/h','0.24','High','Stable'],['Sensor chemistry','NO₂ ratio 1.46','0.22','Medium','Rising'],['Satellite AOD','Regional plume west','0.13','Medium','Falling']].map((row) => <tr key={row[0]}>{row.map((cell, index) => <td key={cell}>{index === 4 ? <StatusChip value={cell.toLowerCase()} /> : cell}</td>)}</tr>)}</tbody></table></div></Panel>
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
    <PageHeader eyebrow="HYPERLOCAL AQI FORECASTING" title="Atmospheric Outlook" description="Probabilistic AQI predictions at one-kilometre resolution, updated every fifteen minutes." actions={<div className="segmented" role="group" aria-label="Forecast horizon">{[6,24,72].map((value) => <button className={horizon === value ? 'active' : ''} onClick={() => setHorizon(value)} key={value}>{value}H</button>)}</div>} />
    <div className="forecast-hero">
      <Panel className="forecast-map-panel" title={`${horizon}-hour dispersion field`} subtitle={`Valid through ${new Date(point.predictedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}><MapPanel readings={data.readings.map((item, index) => ({ ...item, aqi: Math.round(item.aqi + data.forecastDelta * ((index + 3) / 10)) }))} selected={data.readings[0]} /></Panel>
      <div className="forecast-summary"><AqiBadge value={point.predictedAqi} /><div className="forecast-range"><span>EXPECTED RANGE</span><strong>{point.lowerBound}–{point.upperBound}</strong></div><div className="forecast-confidence"><span>MODEL CONFIDENCE</span><strong>{Math.round(point.confidence * 100)}%</strong></div><div className="driver-list"><span>PRIMARY DRIVERS</span>{point.drivers.map((driver) => <div key={driver}><Wind />{driver}</div>)}</div></div>
    </div>
    <div className="two-column-grid wide-left"><Panel title="AQI trend forecast" subtitle="Prediction interval and central estimate"><ForecastChart data={data.forecasts} /></Panel><Panel title="Confidence decay" subtitle="Probability by horizon"><ConfidenceChart data={data.forecasts} /></Panel></div>
    <IntelligenceBrief><p>Stagnant winds are expected through the evening peak, lifting AQI before boundary-layer recovery begins after 02:00. The eastern traffic corridor carries the highest short-term risk.</p></IntelligenceBrief>
  </div>;
}

export function HealthPage() {
  const client = useQueryClient();
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['advisories', activeCityId], queryFn: () => api.advisories(activeCityId) });
  const overviewQuery = useQuery({ queryKey: ['overview', activeCityId], queryFn: () => api.overview(activeCityId) });
  const [showForm, setShowForm] = useState(false);
  const mutation = useMutation({ mutationFn: api.createAdvisory, onSuccess: () => { void client.invalidateQueries({ queryKey: ['advisories'] }); setShowForm(false); } });
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); const form = new FormData(event.currentTarget); mutation.mutate({ cityId: activeCityId, ward: String(form.get('ward')), aqi: Number(form.get('aqi')), audience: ['children', 'older adults', 'respiratory patients'], channels: ['sms', 'push', 'public_display'], status: form.get('publish') ? 'published' : 'draft', reach: Number(form.get('reach')) || 0 }); };
  return <div className="page">
    <PageHeader eyebrow="CITIZEN HEALTH ADVISORY" title="Health Advisory Command" description="Create, approve, and broadcast localized guidance for high-risk populations." actions={<button className="button primary" onClick={() => setShowForm((value) => !value)}><Send />New advisory</button>} />
    <div className="metric-grid four"><MetricCard label="CITIZENS ALERTED TODAY" value={428_190} tone="primary" icon={<Users />} /><MetricCard label="HIGH-RISK WARDS" value={8} tone="danger" icon={<HeartPulse />} /><MetricCard label="DELIVERY RATE" value={98.7} unit="%" tone="success" icon={<Check />} /><MetricCard label="ACTIVE BROADCASTS" value={3} tone="warning" icon={<Radio />} /></div>
    {showForm && <Panel className="form-panel" title="Compose AI-assisted advisory" subtitle="The health agent will produce evidence-aligned language for the selected AQI."><form className="advisory-form" onSubmit={submit}><label>Ward or zone<input name="ward" defaultValue="East Delhi" required /></label><label>Current AQI<input name="aqi" type="number" min="0" max="999" defaultValue="378" required /></label><label>Estimated reach<input name="reach" type="number" min="0" defaultValue="250000" /></label><label className="checkbox-label"><input name="publish" type="checkbox" />Publish immediately after generation</label><div className="form-actions"><button type="button" className="button ghost" onClick={() => setShowForm(false)}>Cancel</button><button className="button primary" disabled={mutation.isPending}><Sparkles />{mutation.isPending ? 'Generating...' : 'Generate advisory'}</button></div>{mutation.error && <div className="form-error">{mutation.error.message}</div>}</form></Panel>}
    <div className="health-layout"><Panel title="Population risk map" subtitle="Vulnerability-weighted exposure zones"><div className="risk-map"><MapPanel readings={overviewQuery.data?.readings ?? []} /></div></Panel><Panel title="Risk cohorts" subtitle="Estimated exposure requiring intervention"><div className="cohort-list">{[['Children under 12','186K','critical'],['Older adults','142K','critical'],['Respiratory patients','89K','warning'],['Outdoor workers','64K','warning']].map(([label,value,status]) => <div key={label}><span><i className={`cohort-${status}`} />{label}</span><strong>{value}</strong></div>)}</div></Panel></div>
    <Panel title="Broadcast ledger" subtitle="Recent public-health communications">{query.isLoading ? <LoadingState label="Loading broadcasts" /> : query.error ? <ErrorState message={query.error.message} /> : !query.data?.length ? <EmptyState title="No advisories" description="Create the first localized advisory." /> : <div className="advisory-list">{query.data.map((item) => <article key={item.id}><div className="advisory-icon"><Cross /></div><div><div className="advisory-title"><strong>{item.ward}</strong><StatusChip value={item.status} /><StatusChip value={item.severity} /></div><p>{item.message}</p><small>{item.channels.join(' · ')} · {item.publishedAt ? relativeTime(item.publishedAt) : 'Not published'}</small></div><div className="advisory-reach"><strong>{formatNumber(item.reach)}</strong><span>REACHED</span></div></article>)}</div>}</Panel>
  </div>;
}

export function EnforcementPage() {
  const client = useQueryClient();
  const { activeCityId } = useCity();
  const query = useQuery({ queryKey: ['enforcement', activeCityId], queryFn: () => api.enforcement(activeCityId) });
  const generate = useMutation({ mutationFn: () => api.generateEnforcement(activeCityId), onSuccess: () => void client.invalidateQueries({ queryKey: ['enforcement'] }) });
  const transition = useMutation({ mutationFn: ({ item, status }: { item: EnforcementCase; status: EnforcementCase['status'] }) => api.updateEnforcement(item.id, status, status === 'dispatched' ? 'Alpha-7' : item.assignedUnit), onSuccess: () => void client.invalidateQueries({ queryKey: ['enforcement'] }) });
  return <div className="page">
    <PageHeader eyebrow="ENFORCEMENT INTELLIGENCE" title="Prioritized Target Matrix" description="Evidence-ranked interventions optimized for immediate air-quality impact." actions={<button className="button primary" onClick={() => generate.mutate()} disabled={generate.isPending}><Sparkles />{generate.isPending ? 'Prioritizing...' : 'Generate priorities'}</button>} />
    <div className="metric-grid four"><MetricCard label="OPEN CASES" value={query.data?.filter((item) => item.status !== 'resolved').length ?? 0} tone="warning" icon={<ShieldCheck />} /><MetricCard label="UNITS DEPLOYED" value={2} tone="success" icon={<LocateFixed />} /><MetricCard label="EST. AQI IMPACT" value="−38" unit=" AQI" tone="success" icon={<TrendingDown />} /><MetricCard label="EVIDENCE FEEDS" value="9 / 9" tone="primary" icon={<Database />} /></div>
    <IntelligenceBrief><p>Industrial plume evidence in Okhla has the strongest confidence-to-impact ratio. Dispatch within 45 minutes to preserve the observable emissions window.</p></IntelligenceBrief>
    <Panel title="Action queue" subtitle="Ranked by impact, urgency, confidence, and deployability" action={<button className="button ghost"><Filter />Filters</button>}>{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : !query.data?.length ? <EmptyState title="Queue clear" description="No enforcement targets require action." /> : <div className="enforcement-list">{query.data.map((item, index) => <article key={item.id}><div className="priority-rank"><span>{String(index + 1).padStart(2,'0')}</span><strong>{item.priority}</strong><small>PRIORITY</small></div><div className="enforcement-main"><div><StatusChip value={item.status} /><span className="case-category">{item.category}</span></div><h3>{item.target}</h3><p><MapPin />{item.ward}</p><div className="case-metrics"><span>Evidence <strong>{Math.round(item.evidenceScore * 100)}%</strong></span><span>Est. impact <strong>−{item.estimatedImpact} AQI</strong></span>{item.assignedUnit && <span>Unit <strong>{item.assignedUnit}</strong></span>}</div></div><div className="case-actions">{item.status === 'queued' && <button className="button primary" onClick={() => transition.mutate({ item, status: 'dispatched' })}><Send />Dispatch unit</button>}{item.status === 'dispatched' && <button className="button secondary" onClick={() => transition.mutate({ item, status: 'investigating' })}>Begin inspection</button>}{item.status === 'investigating' && <button className="button secondary" onClick={() => transition.mutate({ item, status: 'resolved' })}><Check />Resolve</button>}{item.status === 'resolved' && <StatusChip value="complete" />}</div></article>)}</div>}</Panel>
  </div>;
}

export function CitiesPage() {
  const cities = useQuery({ queryKey: ['cities'], queryFn: api.cities });
  if (cities.isLoading) return <LoadingState label="Synchronizing national monitoring grids" />;
  if (cities.error || !cities.data) return <ErrorState message={cities.error?.message ?? 'City data unavailable'} retry={() => void cities.refetch()} />;
  return <div className="page">
    <PageHeader eyebrow="MULTI-CITY INTELLIGENCE" title="National Air Picture" description="Real-time benchmarking and comparative analytics across monitored urban grids." actions={<button className="button secondary"><RefreshCw />Live sync</button>} />
    <div className="cities-layout"><Panel title="National AQI ranking" subtitle="Latest calibrated city readings"><div className="city-ranking">{cities.data.map((city, index) => <article key={city.id}><span className="city-rank">{String(index + 1).padStart(2,'0')}</span><div><strong>{city.name}</strong><small>{city.state}</small></div><AqiBadge value={city.aqi} compact />{city.trend === 'up' ? <ArrowUp className="trend-up" /> : city.trend === 'down' ? <ArrowDown className="trend-down" /> : <ArrowRight />}</article>)}</div></Panel><Panel title="Comparative AQI trajectory" subtitle="Seven-day moving average"><CityTrendChart cities={cities.data} /><div className="chart-legend">{cities.data.slice(0,4).map((city, index) => <span key={city.id}><i className={`legend-color-${index}`} />{city.name}</span>)}</div></Panel></div>
    <div className="two-column-grid wide-left"><Panel title="Pollution source profiles" subtitle="Estimated contribution by city"><ContributionComparison cities={cities.data} /></Panel><Panel title="Intervention efficacy" subtitle="30-day impact against baseline"><div className="efficacy-list">{[['Bengaluru','−14.2%',true],['Mumbai','−8.7%',true],['Delhi','+2.1%',false]].map(([city,value,good]) => <div key={String(city)}><span>{city}</span><strong className={good ? 'positive' : 'negative'}>{good ? <TrendingDown /> : <TrendingUp />}{value}</strong></div>)}</div></Panel></div>
  </div>;
}

export function AlertsPage() {
  const client = useQueryClient();
  const { activeCityId } = useCity();
  const alerts = useQuery({ queryKey: ['alerts', activeCityId], queryFn: () => api.alerts(activeCityId), refetchInterval: 30_000 });
  const correlations = useQuery({ queryKey: ['correlations', activeCityId], queryFn: () => api.correlateAlerts(activeCityId) });
  const [selected, setSelected] = useState<Alert>();
  const [filter, setFilter] = useState('all');
  const mutation = useMutation({ mutationFn: ({ item, status }: { item: Alert; status: Alert['status'] }) => api.updateAlert(item.id, status), onSuccess: () => { void client.invalidateQueries({ queryKey: ['alerts'] }); setSelected(undefined); } });
  const filtered = alerts.data?.filter((item) => filter === 'all' || item.severity === filter) ?? [];
  return <div className="page alerts-page">
    <PageHeader eyebrow="ALERT MANAGEMENT CENTER" title="Mission Feed" description="Correlated incidents, system anomalies, and operational response in one live queue." actions={<div className="segmented"><button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>ALL</button><button className={filter === 'critical' ? 'active' : ''} onClick={() => setFilter('critical')}>CRITICAL</button><button className={filter === 'warning' ? 'active' : ''} onClick={() => setFilter('warning')}>WARNING</button></div>} />
    <div className="alert-layout"><Panel className="alert-feed" title="Live alert feed" subtitle={`${filtered.length} signals in current view`}>{alerts.isLoading ? <LoadingState /> : alerts.error ? <ErrorState message={alerts.error.message} /> : !filtered.length ? <EmptyState title="No matching alerts" description="The selected severity queue is clear." /> : <div className="alert-list">{filtered.map((item) => <button key={item.id} className={`alert-card severity-${item.severity} ${selected?.id === item.id ? 'selected' : ''}`} onClick={() => setSelected(item)}><div><StatusChip value={item.severity} /><StatusChip value={item.status} /><span>{relativeTime(item.createdAt)}</span></div><strong>{item.title}</strong><p>{item.description}</p><small>{item.source} · {item.ward}</small></button>)}</div>}</Panel><div className="alert-intelligence"><Panel title="Alert correlation AI" subtitle="Related signals grouped by time and location">{correlations.isLoading ? <LoadingState /> : <div className="correlation-list">{correlations.data?.clusters.map((cluster) => <article key={cluster.id}><Layers3 /><div><strong>{cluster.summary}</strong><span>{cluster.alertIds.length} source signals · {Math.round(cluster.confidence * 100)}% confidence</span></div><StatusChip value={cluster.severity} /></article>)}</div>}</Panel>{selected ? <Panel className="selected-alert" title="Selected incident" subtitle={selected.id}><div className="incident-title"><Siren /><div><StatusChip value={selected.severity} /><h3>{selected.title}</h3></div></div><p>{selected.description}</p><dl><div><dt>LOCATION</dt><dd>{selected.ward}</dd></div><div><dt>SOURCE</dt><dd>{selected.source}</dd></div><div><dt>STATUS</dt><dd>{selected.status}</dd></div></dl><div className="form-actions">{selected.status === 'open' && <button className="button secondary" onClick={() => mutation.mutate({ item: selected, status: 'acknowledged' })}>Acknowledge</button>}{selected.status !== 'resolved' && <button className="button primary" onClick={() => mutation.mutate({ item: selected, status: 'resolved' })}><Check />Resolve incident</button>}</div></Panel> : <IntelligenceBrief><p>Select an alert to review evidence, ownership, and response controls.</p></IntelligenceBrief>}</div></div>
  </div>;
}

export function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const { activeCityId, setActiveCityId, cities } = useCity();
  const submit = (event: FormEvent) => { event.preventDefault(); setSaved(true); setTimeout(() => setSaved(false), 2500); };
  return <div className="page narrow-page"><PageHeader eyebrow="SYSTEM CONFIGURATION" title="Settings" description="Operator preferences, model controls, and notification routing." /><form onSubmit={submit}><Panel title="Operational defaults" subtitle="Applied to your command center session"><div className="settings-grid"><label>Default city<select value={activeCityId} onChange={(e) => setActiveCityId(e.target.value)}>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label><label>Refresh cadence<select defaultValue="60"><option value="30">30 seconds</option><option value="60">1 minute</option><option value="300">5 minutes</option></select></label><label>Measurement units<select><option>Metric (µg/m³)</option><option>US EPA AQI</option></select></label><label>Timezone<select><option>Asia/Kolkata (IST)</option></select></label></div></Panel><Panel title="Notification routing" subtitle="Choose which signals interrupt your session"><div className="toggle-list">{[['Critical AQI incidents','Always notify for severe threshold crossings',true],['Forecast threshold warnings','Notify two hours before predicted exceedance',true],['Sensor data-quality issues','Notify when a sensor leaves calibration tolerance',false],['Enforcement updates','Notify when field units change case status',true]].map(([title,description,checked]) => <label key={String(title)}><span><strong>{title}</strong><small>{description}</small></span><input type="checkbox" defaultChecked={Boolean(checked)} /></label>)}</div></Panel><div className="settings-actions">{saved && <span className="save-confirmation"><Check />Settings saved</span>}<button className="button primary"><Settings />Save preferences</button></div></form></div>;
}

export function AdminPage() {
  const query = useQuery({ queryKey: ['users'], queryFn: api.users });
  return <div className="page"><PageHeader eyebrow="ACCESS CONTROL" title="Team & Access" description="Operators authorized to access AirIQ intelligence and response workflows." actions={<button className="button primary"><UserCog />Invite operator</button>} /><div className="metric-grid three"><MetricCard label="ACTIVE OPERATORS" value={query.data?.length ?? 0} icon={<Users />} /><MetricCard label="ADMINISTRATORS" value={query.data?.filter((user) => user.role === 'city_admin').length ?? 0} icon={<KeyRound />} /><MetricCard label="SECURITY POSTURE" value="Strong" tone="success" icon={<ShieldCheck />} /></div><Panel title="Operator directory" subtitle="Role-based access is enforced by the API">{query.isLoading ? <LoadingState /> : query.error ? <ErrorState message={query.error.message} /> : <div className="table-wrap"><table><thead><tr><th>Operator</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>{query.data?.map((user) => <tr key={user.id}><td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.role.replaceAll('_',' ')}</td><td><StatusChip value={user.active ? 'active' : 'disabled'} /></td></tr>)}</tbody></table></div>}</Panel></div>;
}

export function NotFoundPage() {
  return <div className="not-found"><div className="not-found-code">404</div><Radio /><h1>Signal not found</h1><p>The requested AirIQ route is outside the active monitoring grid.</p><Link to="/" className="button primary">Return to command center</Link></div>;
}
