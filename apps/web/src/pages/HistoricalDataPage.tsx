import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileDown } from 'lucide-react';
import { api } from '../lib/api';
import { copyRowsToClipboard, downloadCsv } from '../lib/csv';
import type { HistoricalReading } from '../lib/types';
import { useCity } from '../context/CityContext';
import { useToast } from '../components/Toast';
import { EmptyState, ErrorState, LoadingState, PageHeader, PaginationControls, Panel } from '../components/Ui';

export default function HistoricalPage() {
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
