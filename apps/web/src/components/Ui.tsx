import type { ReactNode } from 'react';
import { AlertTriangle, ArrowDownRight, ArrowUpRight, Inbox, RefreshCw, Sparkles } from 'lucide-react';
import { aqiBand, aqiLabel, formatNumber } from '../lib/aqi';

export function PageHeader({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description: string; actions?: ReactNode }) {
  return <header className="page-header"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{actions && <div className="page-actions">{actions}</div>}</header>;
}

export function MetricCard({ label, value, unit, delta, icon, tone = 'primary' }: { label: string; value: string | number; unit?: string; delta?: string; icon?: ReactNode; tone?: 'primary' | 'success' | 'warning' | 'danger' }) {
  return <article className={`metric-card tone-${tone}`}><div className="metric-top"><span>{label}</span>{icon}</div><div className="metric-value">{typeof value === 'number' ? formatNumber(value) : value}{unit && <small>{unit}</small>}</div>{delta && <div className="metric-delta">{delta.startsWith('+') ? <ArrowUpRight /> : <ArrowDownRight />}{delta}</div>}</article>;
}

export function AqiBadge({ value, compact = false }: { value: number; compact?: boolean }) {
  const band = aqiBand(value);
  return <span className={`aqi-badge aqi-${band}`}><strong>{value}</strong>{!compact && <span>{aqiLabel(value)}</span>}</span>;
}

export function AqiBand({ value }: { value: number }) {
  const bands = [
    { label: 'Good', max: 50, color: '#47e6a5' },
    { label: 'Moderate', max: 100, color: '#facc15' },
    { label: 'Unhealthy SG', max: 150, color: '#fb923c' },
    { label: 'Unhealthy', max: 200, color: '#ef4444' },
    { label: 'Very Unhealthy', max: 300, color: '#a855f7' },
    { label: 'Hazardous', max: 500, color: '#7f1d1d' },
  ];
  const active = bands.findIndex((band) => value <= band.max);
  return <div className="aqi-band" aria-label={`AQI band indicator. Current AQI ${value}`}>
    {bands.map((band, index) => <div key={band.label} className={index === active ? 'active' : ''} style={{ background: band.color }}><span>{band.label}</span></div>)}
  </div>;
}

export function PaginationControls({ page, totalPages, total, limit, onPage }: { page: number; totalPages: number; total: number; limit: number; onPage: (page: number) => void }) {
  const start = total === 0 ? 0 : (page - 1) * limit + 1;
  const end = Math.min(total, page * limit);
  return <div className="pagination-controls">
    <span>Showing {start}-{end} of {total}</span>
    <div>
      <button className="button ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
      <button className="button ghost" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  </div>;
}

export function StatusChip({ value }: { value: string }) {
  return <span className={`status-chip status-${value.replaceAll('_', '-')}`}>{value.replaceAll('_', ' ')}</span>;
}

export function Panel({ title, subtitle, action, children, className = '' }: { title?: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{(title || action) && <header className="panel-header"><div>{title && <h2>{title}</h2>}{subtitle && <p>{subtitle}</p>}</div>{action}</header>}{children}</section>;
}

export function IntelligenceBrief({ children, title = 'Intelligence brief' }: { children: ReactNode; title?: string }) {
  return <aside className="intelligence-brief"><div className="intelligence-heading"><Sparkles /><span>{title}</span><small>AI ASSIST</small></div><div>{children}</div></aside>;
}

export function LoadingState({ label = 'Synchronizing intelligence feeds' }: { label?: string }) {
  return <div className="state-panel" role="status"><RefreshCw className="spin" /><strong>{label}</strong><span>Secure connection established</span></div>;
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="state-panel error-state" role="alert"><AlertTriangle /><strong>Data link interrupted</strong><span>{message}</span>{retry && <button className="button secondary" onClick={retry}><RefreshCw />Retry connection</button>}</div>;
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return <div className="state-panel"><Inbox /><strong>{title}</strong><span>{description}</span></div>;
}
